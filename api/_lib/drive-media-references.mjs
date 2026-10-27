/**
 * Fail-closed reference check before a privileged explicit Drive deletion.
 * An app-managed file is not necessarily unreferenced: inspect published,
 * draft, archived, managed-reference and legacy collection documents.
 * Static assets and nested revision histories still require independent
 * inventory review; the delete endpoint is disabled unless explicitly enabled.
 */
const COLLECTIONS = Object.freeze([
  'news','events','pages','societies','sports','leadership','pastPapers',
]);
// These collections are server-only; a client Firebase ID token cannot read them.
const PROTECTED_COLLECTIONS = Object.freeze(['cmsTrash','cmsMediaRefs','extracurricular']);
const MANAGED = /^[A-Za-z0-9_-]{10,128}$/;
const fail = (message,status=503) => Object.assign(new Error(message),{status});

export async function assertDriveMediaUnreferenced(fileId,req,{
  fetcher = fetch,
  project = process.env.FIREBASE_PROJECT_ID,
  serverAccessToken,
}={}) {
  if(typeof fileId !== 'string' || !MANAGED.test(fileId))
    throw fail('Invalid managed Drive file ID.',400);
  if(!project || !/^[a-z][a-z0-9-]{3,62}$/.test(project))
    throw fail('Firebase reference check is not configured.');
  const bearer=/^Bearer ([A-Za-z0-9._-]{20,5000})$/.exec(req?.headers?.authorization || '')?.[1];
  if(!bearer) throw fail('Administrator authentication required.',401);
  let checked=0;
  async function scanCollection(name,token) {
    let cursor='';
    for(let page=0;page<30;page++){
      const url=new URL('https://firestore.googleapis.com/v1/projects/'+
        encodeURIComponent(project)+'/databases/(default)/documents/'+name);
      url.searchParams.set('pageSize','200');
      if(cursor) url.searchParams.set('pageToken',cursor);
      let response;
      try {
        response=await fetcher(url.toString(),{
          method:'GET',headers:{Authorization:'Bearer '+token},
          redirect:'error',signal:AbortSignal.timeout(12000),
        });
      } catch {
        throw fail('Cannot verify whether this Drive file is referenced.');
      }
      if(!response?.ok) throw fail('Cannot verify whether this Drive file is referenced.');
      const data=await response.json().catch(()=>null);
      if(!data || typeof data !== 'object' || Array.isArray(data) ||
          (data.documents!==undefined && !Array.isArray(data.documents)))
        throw fail('Invalid content-reference lookup response.');
      const documents=data.documents || [];
      checked+=documents.length;
      for(const doc of documents){
        // Nested archived snapshot strings and Firestore map/array values are
        // inspected as well as the current CMS image/document URL fields.
        if(JSON.stringify(doc?.fields || {}).includes(fileId))
          throw fail('This Drive file is still referenced by CMS content.',409);
      }
      if(!data.nextPageToken) return;
      if(typeof data.nextPageToken!=='string' || data.nextPageToken.length>2048 ||
          data.nextPageToken===cursor)
        throw fail('Reference pagination was invalid.');
      cursor=data.nextPageToken;
      if(page===29)throw fail('Too many CMS records to verify media deletion safely.');
    }
  }
  for(const name of COLLECTIONS) await scanCollection(name,bearer);
  // The archive and advisory reference index deny client-SDK reads. Reuse the
  // already-configured scoped service account only after the caller passed
  // Firebase authentication and the active-record checks.
  let privilegedBearer;
  try {
    const getToken = serverAccessToken ||
      (await import('./cms-workflow.mjs')).accessToken;
    privilegedBearer=await getToken();
  } catch {
    throw fail('Protected media-reference verification is unavailable.');
  }
  if(typeof privilegedBearer!=='string' || privilegedBearer.length<10 ||
      /[\r\n]/.test(privilegedBearer))
    throw fail('Protected media-reference verification is unavailable.');
  for(const name of PROTECTED_COLLECTIONS) await scanCollection(name,privilegedBearer);
  return {unreferenced:true,recordsChecked:checked};
}
