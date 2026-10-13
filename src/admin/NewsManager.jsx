import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const blank={title:'',category:'News',excerpt:'',body:'',imageUrl:'',published:false};
export default function NewsManager(){
 const [items,setItems]=useState([]),[form,setForm]=useState(blank),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{if(!db){setError('Firebase is not configured.');return;}return onSnapshot(collection(db,'news'),s=>setItems(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))),()=>setError('Cannot load news. Check your admin permissions.'));},[]);
 const change=(key,value)=>setForm(f=>({...f,[key]:value}));
 async function save(e){e.preventDefault();if(!form.title.trim()||!form.excerpt.trim()){setError('Title and summary are required.');return;}setBusy(true);setError('');setNotice('');
  try{const payload={title:form.title.trim(),category:form.category,excerpt:form.excerpt.trim(),body:form.body.trim(),imageUrl:form.imageUrl.trim(),published:form.published,updatedAt:serverTimestamp()};
   if(editing){const original=items.find(i=>i.id===editing);if(form.published&&!original?.published)payload.publishedAt=serverTimestamp();await updateDoc(doc(db,'news',editing),payload);}
   else await addDoc(collection(db,'news'),{...payload,createdAt:serverTimestamp(),...(form.published?{publishedAt:serverTimestamp()}:{})});
   setForm(blank);setEditing(null);setNotice('News saved successfully.');
  }catch{setError('Could not save. Verify Firestore rules and admin access.');}finally{setBusy(false);}
 }
 function edit(item){setEditing(item.id);setForm({title:item.title||'',category:item.category||'News',excerpt:item.excerpt||'',body:item.body||'',imageUrl:item.imageUrl||'',published:!!item.published});setNotice('');}
 async function remove(item){if(!window.confirm(`Delete "${item.title}" permanently?`))return;setError('');try{await deleteDoc(doc(db,'news',item.id));if(editing===item.id){setEditing(null);setForm(blank);}}catch{setError('Unable to delete this article.');}}
 const input='w-full bg-[#181818] border border-white/30 rounded p-3 text-white';
 return <section className="mt-8 space-y-6"><h2 className="text-2xl text-[#C9A84C] font-bold">News Management</h2>
  {error&&<p role="alert" className="text-red-300">{error}</p>}{notice&&<p role="status" className="text-green-300">{notice}</p>}
  <form onSubmit={save} className="grid gap-4 max-w-2xl border border-white/20 p-5 rounded-xl">
   <label>Title<input className={input} maxLength={180} value={form.title} onChange={e=>change('title',e.target.value)} required/></label>
   <label>Category<select className={input} value={form.category} onChange={e=>change('category',e.target.value)}><option>News</option><option>Announcements</option></select></label>
   <label>Summary<textarea className={input} rows={3} maxLength={500} value={form.excerpt} onChange={e=>change('excerpt',e.target.value)} required/></label>
   <label>Article body<textarea className={input} rows={6} value={form.body} onChange={e=>change('body',e.target.value)}/></label>
   <label>Image URL (optional)<input className={input} type="url" value={form.imageUrl} onChange={e=>change('imageUrl',e.target.value)} placeholder="https://..."/></label>
   <label className="flex gap-2 items-center"><input type="checkbox" checked={form.published} onChange={e=>change('published',e.target.checked)}/> Publish on website</label>
   <div className="flex gap-3"><button disabled={busy} className="bg-[#C9A84C] text-black px-5 py-2 rounded disabled:opacity-50">{busy?'Saving...':editing?'Update article':'Add article'}</button><button type="button" className="border px-4 rounded" onClick={()=>{setEditing(null);setForm(blank);}}>Clear</button></div>
  </form>
  <div className="grid gap-3">{items.map(item=><article key={item.id} className="border border-white/20 rounded p-4 flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{item.title}</h3><p className="text-white/60 text-sm">{item.category} · {item.published?'Published':'Draft'}</p></div><div className="flex gap-3"><button className="text-[#C9A84C]" onClick={()=>edit(item)}>Edit</button><button className="text-red-300" onClick={()=>remove(item)}>Delete</button></div></article>)}</div>
 </section>;
}
