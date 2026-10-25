export default async function handler(req,res) {
  const { configured, requireMethod, requireSameOrigin, requireAdmin, oauthStart, setCookie, cookies, errorReply } = await import('../_lib/drive.mjs');
  if(!requireMethod(req,res,'POST')) return;
  try {
    if(!configured()) throw new Error('Google Drive is not configured');
    requireSameOrigin(req);
    const uid=await requireAdmin(req);
    const flow=oauthStart(uid);
    res.setHeader('Set-Cookie',setCookie(cookies.state,flow.cookie,600,'/api/drive/callback'));
    res.status(200).json({url:flow.url});
  } catch(e){errorReply(res,e);}
}
