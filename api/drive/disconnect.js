import { requireMethod,requireSameOrigin,requireAdmin,clearCookie,cookies,errorReply } from '../_lib/drive.mjs';
export default async function handler(req,res){
  if(!requireMethod(req,res,'POST'))return;
  try {
    requireSameOrigin(req);
    await requireAdmin(req);
    res.setHeader('Set-Cookie',clearCookie(cookies.session));
    res.status(200).json({connected:false});
  }catch(e){errorReply(res,e)}
}
