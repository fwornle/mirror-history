import { parseMetaExport, fixMetaText } from '../../node_modules/.cache/mirror-history/meta-export.mjs';
import { fbProfile, fbPosts, igPosts, igProfile } from './meta-export-fixtures.mjs';

let fails = 0;
const check = (name, cond, extra='') => { console.log((cond?'PASS  ':'FAIL  ')+name+(extra?'  '+extra:'')); if(!cond) fails++; };

check('mojibake repaired', fixMetaText('FranÃ§ois') === 'François', fixMetaText('FranÃ§ois'));
check('clean text untouched', fixMetaText('Francois') === 'Francois');

const p = parseMetaExport('profile_information.json', JSON.stringify(fbProfile));
check('fb birthday extracted', p.birthDate === '1971-03-14', p.birthDate);
check('fb name de-mangled', p.ownerName === 'François Müller', p.ownerName);
check('fb milestones found', p.events.length === 3, String(p.events.length));
check('fb education title', p.events.some(e=>e.title==='Started at TU München'), p.events.map(e=>e.title).join(' | '));
check('fb work title', p.events.some(e=>e.title==='Engineer at BMW Group'));
check('fb move title', p.events.some(e=>e.title==='Moved to Budapest'));
check('milestones weighted 3', p.events.every(e=>e.weight===3));

const posts = parseMetaExport('your_posts_1.json', JSON.stringify(fbPosts));
check('fb real post kept', posts.events.some(e=>e.title.startsWith('Moved into the new flat')), posts.events.map(e=>e.title).join(' | '));
check('fb boilerplate dropped', !posts.events.some(e=>/updated (his|her|their)/i.test(e.title)));
check('fb nested media caption', posts.events.some(e=>e.title==='Sunrise over the Danube'));
check('posts weighted 1', posts.events.filter(e=>e.source==='facebook').every(e=>e.weight===1));

const ig = parseMetaExport('instagram_posts_1.json', JSON.stringify(igPosts));
check('ig source detected', ig.source === 'instagram', ig.source);
check('ig caption de-mangled', ig.events.some(e=>e.title==='First day at the new job é'), ig.events.map(e=>e.title).join(' | '));

const igp = parseMetaExport('personal_information.json', JSON.stringify(igProfile));
check('ig dob extracted', igp.birthDate === '1971-03-14', igp.birthDate);

const again = parseMetaExport('your_posts_1.json', JSON.stringify(fbPosts));
check('ids stable across re-import', JSON.stringify(again.events.map(e=>e.id))===JSON.stringify(posts.events.map(e=>e.id)));

check('garbage rejected cleanly', (()=>{ try { parseMetaExport('x.json','not json'); return false; } catch(e){ return /not valid JSON/.test(e.message); } })());
check('empty array survives', parseMetaExport('e.json','[]').events.length === 0);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails?1:0);
