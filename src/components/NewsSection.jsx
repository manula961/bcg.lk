import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function NewsSection() {
  const [posts,setPosts]=useState([]);
  const [filter,setFilter]=useState('All');
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!db){setError('News is temporarily unavailable.');return;}
    return onSnapshot(query(collection(db,'news'),where('published','==',true)),snapshot=>{
      setPosts(snapshot.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.publishedAt?.seconds||b.createdAt?.seconds||0)-(a.publishedAt?.seconds||a.createdAt?.seconds||0)));
      setError('');
    },()=>setError('Unable to load news right now.'));
  },[]);
  const visible=posts.filter(p=>filter==='All'||p.category===filter);
  return <section id="news" className="bg-[#100606] text-white py-24 px-6">
    <div className="max-w-6xl mx-auto">
      <p className="text-[#C9A84C] tracking-[.3em] uppercase text-xs">Nayakenz</p>
      <h2 className="text-4xl font-bold my-5">LATEST UPDATES</h2>
      <div className="flex gap-3 mb-8 flex-wrap">{['All','Announcements','News'].map(f=><button key={f} type="button" onClick={()=>setFilter(f)} aria-pressed={filter===f} className={`rounded-full px-5 py-2 border border-[#C9A84C] ${filter===f?'bg-[#7B1C1C]':'bg-transparent'}`}>{f}</button>)}</div>
      {error&&<p role="alert">{error}</p>}
      {!error&&!visible.length&&<p className="text-white/70">No published updates yet.</p>}
      <div className="grid gap-6 md:grid-cols-2">{visible.map(post=><article key={post.id} className="bg-[#171717] rounded-xl overflow-hidden border border-white/10">
        {post.imageUrl&&<img src={post.imageUrl} alt="" loading="lazy" className="w-full h-52 object-cover"/>}
        <div className="p-6">
          <p className="text-[#C9A84C] text-sm">{post.category||'News'} · {post.publishedAt?.toDate?.().toLocaleDateString()||''}</p>
          <h3 className="text-xl font-bold mt-2">{post.title}</h3>
          <p className="text-white/70 mt-3 whitespace-pre-wrap">{post.excerpt}</p>
          {post.body&&<details className="mt-4"><summary className="cursor-pointer text-[#C9A84C]">Read more</summary><p className="whitespace-pre-wrap mt-3 text-white/80">{post.body}</p></details>}
        </div></article>)}</div>
    </div>
  </section>;
}
