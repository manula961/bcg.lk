import { configured, requireMethod, requireSameOrigin, requireAdmin, oauthStart, setCookie, cookies, errorReply } from '../_lib/drive.mjs';
export default async function handler(req,res) {
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
