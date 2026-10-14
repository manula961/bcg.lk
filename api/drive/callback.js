import { configured,requireMethod,checkOAuthState,googleToken,googleRedirect,seal,setCookie,clearCookie,cookies } from '../_lib/drive.mjs';
export default async function handler(req,res) {
  if(!requireMethod(req,res,'GET')) return;
  const origin=new URL(process.env.GOOGLE_OAUTH_REDIRECT_URI||'https://invalid.example').origin;
  try {
    if(!configured()) throw Error('Not configured');
    if(req.query.error) throw Error('Google access denied');
    const code=req.query.code, state=req.query.state;
    if(typeof code!=='string'||typeof state!=='string') throw Error('Missing OAuth response');
    const pending=checkOAuthState(req,state);
    const result=await googleToken({
      grant_type:'authorization_code',code,redirect_uri:googleRedirect(),code_verifier:pending.verifier,
    });
    if(!result.refresh_token) throw Error('Google did not issue an offline refresh token');
    const cookie=seal({uid:pending.uid,refresh:result.refresh_token,exp:Date.now()+30*86400000});
    res.setHeader('Set-Cookie',[
      clearCookie(cookies.state,'/api/drive/callback'),
      setCookie(cookies.session,cookie,30*86400),
    ]);
    res.redirect(303,origin+'/admin?drive=connected');
  } catch(error) {
    console.error('[Drive callback]',error.message);
    res.setHeader('Set-Cookie',clearCookie(cookies.state,'/api/drive/callback'));
    res.redirect(303,origin+'/admin?drive=error');
  }
}
