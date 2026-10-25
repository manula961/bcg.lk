import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCmsPatch, validateCmsRecord } from '../api/_lib/cms-schema.mjs';

const text = value => ({stringValue:value});
const stamp = value => ({timestampValue:value});
const base = {published:{booleanValue:false},createdAt:stamp('2026-10-25T00:00:00Z')};
const fixtures = {
  news:{title:text('Headline'),excerpt:text('Summary'),category:text('News')},
  events:{title:text('Annual day'),description:text('Details'),eventDate:text('2026-10-25'),location:text('Hall')},
  pages:{slug:text('about-school'),title:text('About school'),body:text('Article body')},
  societies:{title:text('Science'),description:text('Academic society')},
  sports:{title:text('Cricket'),description:text('School sport')},
  leadership:{title:text('Principal'),role:text('Principal')},
  pastPapers:{title:text('Mathematics'),exam:text('O/L'),subject:text('Math'),year:text('2025'),language:text('English'),url:text('https://example.edu/paper.pdf')},
};
const idFor = kind => kind === 'pages' ? 'about-school' : 'record-1';

test('privileged CMS validates seven complete Firestore collection schemas',()=>{
  for(const [kind,fields] of Object.entries(fixtures)) {
    const doc={...base,...fields};
    assert.equal(validateCmsRecord(kind,idFor(kind),doc),doc,kind);
    assert.throws(()=>validateCmsRecord(kind,idFor(kind),{...doc,published:{booleanValue:'true'}}),{status:400},kind);
    assert.throws(()=>validateCmsRecord(kind,idFor(kind),{...doc,super_admin:{stringValue:'yes'}}),{status:400},kind);
    for(const key of Object.keys(fields)){
      assert.throws(()=>validateCmsRecord(kind,idFor(kind),{...doc,[key]:text('')}),{status:400},kind+' '+key);
    }
  }
});
test('reject required field omission even when REST security rules are bypassed',()=>{
  for(const [kind,fields] of Object.entries(fixtures))
    for(const key of Object.keys(fields).filter(x=>!['category'].includes(x))) {
      const copy={...base,...fields};delete copy[key];
      assert.throws(()=>validateCmsRecord(kind,idFor(kind),copy),{status:400},kind+' '+key);
    }
});
test('reject malformed timestamps, HTTPS URLs, enums and mismatched page IDs',()=>{
  const news={...base,...fixtures.news};
  assert.throws(()=>validateCmsRecord('news','record-1',{...news,imageUrl:text('javascript:alert(1)')}),{status:400});
  assert.throws(()=>validateCmsRecord('news','record-1',{...news,category:text('Not news')}),{status:400});
  assert.throws(()=>validateCmsRecord('news','record-1',{...news,createdAt:text('yesterday')}),{status:400});
  assert.throws(()=>validateCmsRecord('pages','different',{...base,...fixtures.pages}),{status:400});
  assert.throws(()=>validateCmsRecord('events','record-1',{...base,...fixtures.events,eventDate:text('2026-02-30')}),{status:400});
  assert.throws(()=>validateCmsRecord('pastPapers','record-1',{...base,...fixtures.pastPapers,url:text('http://example.edu/paper.pdf')}),{status:400});
});
test('published edit patch rejects empty required strings and metadata mutation',()=>{
  for(const kind of Object.keys(fixtures)){
    assert.throws(()=>validateCmsPatch(kind,{title:'  '}),{status:400},kind);
    assert.throws(()=>validateCmsPatch(kind,{published:'true'}),{status:400},kind);
  }
  assert.throws(()=>validateCmsPatch('pages',{slug:'new-slug'}),{status:400});
  assert.throws(()=>validateCmsPatch('events',{eventDate:'2026-02-30'}),{status:400});
  assert.deepEqual(validateCmsPatch('news',{title:'  Revised  '}),{title:text('Revised')});
});
