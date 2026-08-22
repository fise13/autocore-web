import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.trim()&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');let v=l.slice(i+1).trim();if(v.length>=2&&(v[0]==='"'||v[0]==="'")&&v.at(-1)===v[0])v=v.slice(1,-1);return[l.slice(0,i).trim(),v];}));
initializeApp({credential:cert(JSON.parse(readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH,'utf8')))});
const db=getFirestore();
const s=await db.collection('companies').doc('G2qUAEIYrhBStuxd1AKT').collection('billing').doc('subscription').get();
const d=s.data();
console.log(JSON.stringify({plan:d.plan,status:d.status,proActive:d.proActive,provider:d.provider,
 currentPeriodEnd:d.currentPeriodEnd?.toDate?.()?.toISOString?.(),updatedAt:d.updatedAt?.toDate?.()?.toISOString?.(),
 expiredAt:d.expiredAt?.toDate?.()?.toISOString?.()??null, now:new Date().toISOString()},null,2));
