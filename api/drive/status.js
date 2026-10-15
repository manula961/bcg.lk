import { configured,requireMethod,requireAdmin,verifySession,errorReply } from '../_lib/drive.mjs';
export default async function handler(req,res){
  if(!requireMethod(req,res,'GET'))return;
  try {
    const uid=await requireAdmin(req);
    let connected=false;
    if(configured()) try {verifySession(req,uid);connected=true;}catch{}
    res.status(200).json({configured:configured(),connected});
  }catch(e){errorReply(res,e)}
}
