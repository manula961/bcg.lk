export default async function handler(req,res) {
  const { requireMethod,requireSameOrigin,requireAdmin,verifySession,revokeGoogleAccess,clearCookie,cookies,errorReply } = await import('../_lib/drive.mjs');
  if(!requireMethod(req,res,'POST'))return;
  try {
    requireSameOrigin(req);
    const uid=await requireAdmin(req);
    const session=verifySession(req,uid);
    await revokeGoogleAccess(session.refresh);
    res.setHeader('Set-Cookie',clearCookie(cookies.session));
    res.status(200).json({connected:false});
  }catch(e){errorReply(res,e)}
}
