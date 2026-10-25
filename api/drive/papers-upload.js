export const config={api:{bodyParser:false}};
export default async function handler(req,res) {
  const { configured,requireMethod,requireSameOrigin,requireAdmin,verifySession,accessToken,readPdf,driveUploadPaper,errorReply } = await import('../_lib/drive.mjs');
  if(!requireMethod(req,res,'POST')) return;
  try {
    if(!configured()) throw new Error('Google Drive is not configured');
    requireSameOrigin(req);
    const uid=await requireAdmin(req);
    const session=verifySession(req,uid);
    const pdf=await readPdf(req);
    const token=await accessToken(session.refresh);
    res.status(200).json(await driveUploadPaper(token,pdf));
  } catch(e){errorReply(res,e);}
}
