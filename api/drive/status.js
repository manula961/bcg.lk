export default async function handler(req,res) {
  const { configured,requireMethod,requireAdmin,verifySession,errorReply } = await import('../_lib/drive.mjs');
  if(!requireMethod(req,res,'GET'))return;
  try {
    const uid=await requireAdmin(req);
    let connected=false;
    if(configured()) try {verifySession(req,uid);connected=true;}catch{}
    res.status(200).json({configured:configured(),connected});
  }catch(e){errorReply(res,e)}
}
