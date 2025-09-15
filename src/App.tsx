import React, { useMemo, useState, useEffect } from "react";

// Stable full prototype. Single JSX file, no external CSS.
// Includes: Mood Search (auto-selects into profile), Profile, Quests (require registration),
// Perks+Wallet, Discover (book + author) with Saved badge, Bookshelf,
// Feedback → points, Community Feed showing submitted feedback.

const EMOTIONS = ["hopeful","curious","grounded","challenged","comforted","energized","mysterious","resilient","joyful","focused","reflective"];
const CATEGORIES = ["mental","spiritual","emotional","functional","financial","social"];

const AUTHORS = [
  { id:"a1", name:"A. North", bio:"Writes practical self-development with heart.", moods:["focused","grounded","resilient"], domains:["mental","functional"] },
  { id:"a2", name:"P. Ledger", bio:"Personal finance stories with actionable scripts.", moods:["grounded","hopeful"], domains:["financial","functional"] },
  { id:"a3", name:"S. Vale", bio:"Contemplative essays about doubt, meaning, and wonder.", moods:["reflective","mysterious"], domains:["spiritual","emotional"] },
  { id:"a4", name:"R. Kellan", bio:"Community, trust, and social capital at scale.", moods:["curious","hopeful"], domains:["social","emotional"] },
  { id:"a5", name:"M. Ray", bio:"Protocols for attention, focus, and cognitive stamina.", moods:["focused","energized"], domains:["mental","functional"] },
  { id:"a6", name:"I. Ocean", bio:"Gentle grit: resilience without burnout.", moods:["resilient","challenged"], domains:["emotional","spiritual"] },
];

const BOOKS = [
  { id:"b1", title:"Atomic Habits of the Heart", authorId:"a1", emotions:["focused","grounded","resilient"], categories:["mental","functional"], blurb:"Tiny mental shifts, big life compounding. Practical, kind, and honest."},
  { id:"b2", title:"Wallet Wisdom", authorId:"a2", emotions:["grounded","hopeful"], categories:["financial","functional"], blurb:"Personal finance made human—stories, scripts, and small wins."},
  { id:"b3", title:"Quiet Thunder", authorId:"a3", emotions:["reflective","mysterious"], categories:["spiritual","emotional"], blurb:"A contemplative walk through doubt and meaning with poetic prose."},
  { id:"b4", title:"Networks of Belonging", authorId:"a4", emotions:["curious","hopeful"], categories:["social","emotional"], blurb:"Community mechanics: how relationships scale trust and opportunity."},
  { id:"b5", title:"Rebuild Your Attention", authorId:"a5", emotions:["focused","energized"], categories:["mental","functional"], blurb:"Protocols to reclaim focus in a noisy world. Field-tested routines."},
  { id:"b6", title:"The Courage Ledger", authorId:"a6", emotions:["resilient","challenged"], categories:["emotional","spiritual"], blurb:"Short essays to grow grit without grinding yourself down."}
];

const PERKS = [
  { id:"p1", name:"10% off eBook", cost:50, type:"discount" },
  { id:"p2", name:"Bonus Chapter Pack", cost:100, type:"content" },
  { id:"p3", name:"Signed Copy Raffle Entry", cost:250, type:"raffle" },
  { id:"p4", name:"Virtual Author Meet Ticket", cost:500, type:"experience" },
  { id:"p5", name:"VIP Beta-Reader Slot", cost:1000, type:"experience" }
];

const QUESTS = [
  { id:"q1", domain:"mental", title:"Deep Focus Sprint", desc:"Read 3 focused chapters this week.", reward:30 },
  { id:"q2", domain:"financial", title:"$50 Saved", desc:"Capture 3 saving tactics; implement one.", reward:40 },
  { id:"q3", domain:"emotional", title:"Resilience Notes", desc:"Journal 5 takeaways that build resilience.", reward:35 },
  { id:"q4", domain:"spiritual", title:"Quiet Morning", desc:"Read 20 minutes for 3 mornings.", reward:25 },
  { id:"q5", domain:"functional", title:"Micro-Habit", desc:"Ship one tiny routine for 7 days.", reward:45 },
  { id:"q6", domain:"social", title:"Invite a Friend", desc:"Share a book and discuss a chapter.", reward:30 },
];

function tierFromPoints(points){
  if(points>=1000) return { name:"Platinum" };
  if(points>=500)  return { name:"Gold" };
  if(points>=200)  return { name:"Silver" };
  return { name:"Bronze" };
}

function tokenizeMood(q=""){ return q.toLowerCase().split(/[^a-z]+/).filter(Boolean); }
function mapTokens(tokens){
  const emo=new Set(), cat=new Set();
  tokens.forEach(t=>{
    if(["hope","hopeful","optimistic"].includes(t)) emo.add("hopeful");
    if(["focus","focused","clarity","stuck"].includes(t)) emo.add("focused");
    if(["calm","grounded","stable"].includes(t)) emo.add("grounded");
    if(["challenge","challenged","stretch"].includes(t)) emo.add("challenged");
    if(["cozy","comfort","comforted"].includes(t)) emo.add("comforted");
    if(["energy","energized","motivation"].includes(t)) emo.add("energized");
    if(["mystery","mysterious"].includes(t)) emo.add("mysterious");
    if(["resilience","resilient","grit"].includes(t)) emo.add("resilient");
    if(["joy","joyful","happy"].includes(t)) emo.add("joyful");
    if(["reflect","reflective","introspect"].includes(t)) emo.add("reflective");
    if(["mind","mental","focus"].includes(t)) cat.add("mental");
    if(["spirit","spiritual","faith"].includes(t)) cat.add("spiritual");
    if(["feel","emotional","emotion"].includes(t)) cat.add("emotional");
    if(["habit","routine","functional","productivity"].includes(t)) cat.add("functional");
    if(["money","budget","finance","financial","save"].includes(t)) cat.add("financial");
    if(["social","friend","community","belong"].includes(t)) cat.add("social");
  });
  return { emotions:[...emo], categories:[...cat] };
}

function scoreMatch(book, desired, cats, extra={}){
  const emoOverlap = desired.filter(e=>book.emotions.includes(e)).length;
  const catOverlap = cats.filter(c=>book.categories.includes(c)).length;
  const extraEmo = (extra.emotions||[]).filter(e=>book.emotions.includes(e)).length;
  const extraCat = (extra.categories||[]).filter(c=>book.categories.includes(c)).length;
  return emoOverlap*2 + catOverlap + extraEmo*2 + extraCat;
}

const findAuthor = (id)=> AUTHORS.find(a=>a.id===id) || { name:"Unknown", bio:"", moods:[], domains:[] };

export default function App(){
  const [profile,setProfile] = useState({ name:"Guest Reader", desired:["hopeful","focused"], categories:["mental","emotional"] });
  const [moodQuery,setMoodQuery] = useState("");
  const [queue,setQueue] = useState(BOOKS);
  const [bookshelf,setBookshelf] = useState([]);
  const [points,setPoints] = useState(0);
  const [wallet,setWallet] = useState([]);
  const [feedback,setFeedback] = useState({ aha:"", breakthrough:"", favorite:"" });
  const [savedIds,setSavedIds] = useState([]);
  const [followedAuthors,setFollowedAuthors] = useState([]);
  const [showRegister,setShowRegister] = useState(false);
  const [feed, setFeed] = useState([]); // community feed (feedback + future proofs)

  const moodTokens = useMemo(()=>mapTokens(tokenizeMood(moodQuery)),[moodQuery]);

  // Auto-merge search moods/categories into profile (idempotent)
  useEffect(()=>{
    setProfile(p=>({
      ...p,
      desired:[...new Set([...p.desired, ...moodTokens.emotions])],
      categories:[...new Set([...p.categories, ...moodTokens.categories])]
    }));
  },[JSON.stringify(moodTokens)]);

  const sorted = useMemo(()=>{
    return [...queue].sort((a,b)=>
      scoreMatch(b,profile.desired,profile.categories,moodTokens) -
      scoreMatch(a,profile.desired,profile.categories,moodTokens)
    );
  },[queue,profile.desired,profile.categories,moodTokens]);
  const top = sorted[0];

  function toggleEmotion(e){ setProfile(p=>({ ...p, desired: p.desired.includes(e) ? p.desired.filter(x=>x!==e) : [...p.desired, e] })); }
  function toggleCategory(c){ setProfile(p=>({ ...p, categories: p.categories.includes(c) ? p.categories.filter(x=>x!==c) : [...p.categories, c] })); }
  function swipeKeep(){ if(!top) return; if(!savedIds.includes(top.id)){ setBookshelf(s=>[...s,top]); setSavedIds(ids=>[...ids, top.id]); } setQueue(q=>[...q.slice(1), q[0]]); }
  function swipePass(){ if(!top) return; setQueue(q=>[...q.slice(1), q[0]]); }

  // Submit feedback → award points + post to Community Feed
  function submitFeedback(){
    const ts = Date.now();
    const user = profile.name || "Guest Reader";

    const items = [];
    let total = 0;

    if (feedback.aha.trim()) {
      items.push({ id: "fb-"+ts+"-a", type: "Aha!", content: feedback.aha.trim(), points: 10, user, ts });
      total += 10;
    }
    if (feedback.breakthrough.trim()) {
      items.push({ id: "fb-"+ts+"-b", type: "Breakthrough", content: feedback.breakthrough.trim(), points: 25, user, ts });
      total += 25;
    }
    if (feedback.favorite.trim()) {
      items.push({ id: "fb-"+ts+"-f", type: "Favorite", content: feedback.favorite.trim(), points: 5, user, ts });
      total += 5;
    }

    if (!items.length) return;

    // prepend items; keep feed small
    setFeed(prev => [...items, ...prev].slice(0, 30));

    setPoints(p=>p+total);
    setFeedback({ aha:"", breakthrough:"", favorite:"" });
  }

  function redeem(perk){ if(points<perk.cost) return; setPoints(p=>p-perk.cost); const code=`${perk.type.toUpperCase()}-${perk.id}-${Math.random().toString(36).slice(2,8)}`; setWallet(w=>[...w,{...perk, code}]); }
  function followAuthor(aid){ if(followedAuthors.includes(aid)) return; setFollowedAuthors(f=>[...f,aid]); }

  const tier = tierFromPoints(points);

  // UI helpers
  const pill = (active)=>({ padding:"4px 10px", borderRadius:999, border:"1px solid #ddd", background: active?"#111":"#fff", color: active?"#fff":"#111", fontSize:12 });
  const card = { background:"#fff", border:"1px solid #eee", borderRadius:16, padding:16, boxShadow:"0 1px 2px rgba(0,0,0,0.04)" };
  const h2 = { fontWeight:600, marginBottom:8 };
  const badge = { padding:"2px 8px", borderRadius:999, border:"1px solid #ddd", fontSize:12 };

  const author = top ? AUTHORS.find(a=>a.id===top.authorId) : null;

  return (
    <div style={{minHeight:"100vh", background:"#fafafa", color:"#111"}}>
      {/* Header */}
      <header style={{position:"sticky", top:0, zIndex:10, background:"rgba(255,255,255,0.9)", backdropFilter:"blur(4px)", borderBottom:"1px solid #eee"}}>
        <div style={{maxWidth:1200, margin:"0 auto", padding:"12px 16px", display:"flex", alignItems:"center", gap:12}}>
          <div style={{fontWeight:700, fontSize:20}}>MatchReads</div>
          <div style={{marginLeft:"auto", display:"flex", gap:8, alignItems:"center"}}>
            <span style={badge}>{tier.name}</span>
            <span aria-label="points" style={{...badge, background:"#111", color:"#fff", borderColor:"#111"}}>{points} pts</span>
          </div>
        </div>
      </header>

      {/* Mood Search */}
      <div style={{maxWidth:1200, margin:"0 auto", padding:16}}>
        <div style={{...card, display:"flex", gap:8, alignItems:"center"}}>
          <input value={moodQuery} onChange={e=>setMoodQuery(e.target.value)} placeholder="I feel stuck… I want to feel hopeful and save money"
                 style={{flex:1, border:"1px solid #ddd", borderRadius:12, padding:10, fontSize:14}} />
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            {moodTokens.emotions.map(e=> (
              <button key={e} onClick={()=>toggleEmotion(e)}
                      style={{...badge, background: profile.desired.includes(e)?"#111":"#fff", color: profile.desired.includes(e)?"#fff":"#111", borderColor: profile.desired.includes(e)?"#111":"#ddd"}}>{e}</button>
            ))}
            {moodTokens.categories.map(c=> (
              <button key={c} onClick={()=>toggleCategory(c)}
                      style={{...badge, background: profile.categories.includes(c)?"#111":"#fff", color: profile.categories.includes(c)?"#fff":"#111", borderColor: profile.categories.includes(c)?"#111":"#ddd"}}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 3-column grid */}
      <main style={{maxWidth:1200, margin:"0 auto", padding:16, display:"grid", gap:16, gridTemplateColumns:"1fr 1fr 1fr"}}>
        {/* Left: Profile + Quests + Perks */}
        <section style={{display:"grid", gap:16}}>
          <div style={card}>
            <h3 style={h2}>Your Profile</h3>
            <input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}
                   placeholder="Your name" style={{width:"100%", border:"1px solid #ddd", borderRadius:12, padding:10, fontSize:14, marginBottom:10}} />
            <div style={{fontSize:12, fontWeight:600, marginBottom:6}}>Desired Emotions</div>
            <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:12}}>
              {EMOTIONS.map(e=> (<button key={e} onClick={()=>toggleEmotion(e)} style={pill(profile.desired.includes(e))}>{e}</button>))}
            </div>
            <div style={{fontSize:12, fontWeight:600, marginBottom:6}}>Growth Categories</div>
            <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
              {CATEGORIES.map(c=> (<button key={c} onClick={()=>toggleCategory(c)} style={pill(profile.categories.includes(c))}>{c}</button>))}
            </div>
          </div>

          <div style={card}>
            <h3 style={h2}>Side Quests / Missions <span style={{...badge, marginLeft:8, color:'#777', borderColor:'#ddd'}}>Register to complete</span></h3>
            <div style={{display:"grid", gap:8}}>
              {QUESTS.map(q=> (
                <div key={q.id} style={{border:"1px solid #eee", borderRadius:12, padding:12, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:500}}>{q.title} <span style={badge}>{q.domain}</span></div>
                    <div style={{fontSize:12, color:"#666"}}>{q.desc}</div>
                  </div>
                  <button onClick={()=>setShowRegister(true)}
                          style={{padding:"6px 10px", borderRadius:8, border:"1px solid #ddd", background:"#111", color:"#fff"}}>
                    {`Complete (+${q.reward})`}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <h3 style={h2}>Perks Marketplace</h3>
            <div style={{display:"grid", gap:8}}>
              {PERKS.map(p=> (
                <div key={p.id} style={{display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid #eee", borderRadius:12, padding:12}}>
                  <div>
                    <div style={{fontWeight:500}}>{p.name}</div>
                    <div style={{fontSize:12, color:"#666"}}>Cost: {p.cost} pts</div>
                  </div>
                  <button onClick={()=>redeem(p)} disabled={points<p.cost}
                          style={{padding:"6px 10px", borderRadius:8, border:"1px solid #ddd", background: points>=p.cost?"#111":"#f2f2f2", color: points>=p.cost?"#fff":"#999"}}>Redeem</button>
                </div>
              ))}
            </div>
            <div style={{marginTop:12}}>
              <h4 style={{fontWeight:600, marginBottom:6}}>Wallet</h4>
              {wallet.length===0 ? (<div style={{fontSize:14, color:"#666"}}>No perks redeemed yet.</div>) : (
                <ul style={{display:"grid", gap:8}}>
                  {wallet.map(w=> (<li key={w.code} style={{border:"1px solid #eee", borderRadius:12, padding:12}}><div style={{fontWeight:500}}>{w.name}</div><div style={{fontSize:12, color:"#666"}}>Code: {w.code}</div></li>))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Middle: Discover + Author card */}
        <section>
          <div style={{...card, display:"flex", flexDirection:"column", minHeight:300}}>
            <h3 style={h2}>Discover</h3>
            {!top ? (
              <div style={{color:"#666"}}>No more books in queue.</div>
            ) : (
              <>
                <div style={{border:"1px solid #eee", borderRadius:12, padding:12, marginBottom:12}}>
                  <div style={{fontSize:12, color:"#666"}}>Match score: {scoreMatch(top, profile.desired, profile.categories, moodTokens)}</div>
                  <div style={{fontWeight:700, fontSize:20}}>{top.title}</div>
                  <div style={{fontSize:12, marginBottom:4, color:"#6b7280"}}>by {author?.name}</div>
                  <p style={{fontSize:14, marginBottom:8}}>{top.blurb}</p>
                  {savedIds.includes(top.id) && <span style={{fontSize:12, color:"green", fontWeight:600}}>✔ Saved</span>}
                  <div style={{display:"flex", gap:8, marginTop:8}}>
                    <button onClick={swipePass} style={{flex:1, padding:"10px 12px", borderRadius:12, border:"1px solid #ddd", background:"#fff"}}>Not for me</button>
                    <button onClick={swipeKeep} style={{flex:1, padding:"10px 12px", borderRadius:12, border:"1px solid #111", background:"#111", color:"#fff"}}>Save</button>
                  </div>
                </div>

                <div style={{border:"1px solid #eee", borderRadius:12, padding:12}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:600}}>Author: {author?.name}</div>
                      <div style={{fontSize:12, color:"#666"}}>{author?.bio}</div>
                      <div style={{display:"flex", gap:6, marginTop:6, flexWrap:"wrap"}}>
                        {author?.moods.map(m=> <span key={m} style={badge}>{m}</span>)}
                        {author?.domains.map(d=> <span key={d} style={badge}>{d}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Right: Community Feed + Bookshelf + Feedback */}
        <section style={{display:"grid", gap:16}}>
          <div style={card}>
            <h3 style={h2}>Community Feed</h3>
            {feed.length===0 ? (
              <div style={{fontSize:14, color:"#666"}}>
                When readers share feedback or submit proofs, it appears here.
                (Quest proofs will show once registration is enabled.)
              </div>
            ) : (
              <ul style={{display:"grid", gap:8}}>
                {feed.map(item => (
                  <li key={item.id} style={{border:"1px solid #eee", borderRadius:12, padding:12}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                      <div style={{fontWeight:600}}>{item.user}</div>
                      <span style={{...badge, background:"#111", color:"#fff", borderColor:"#111"}}>{item.type}</span>
                    </div>
                    <div style={{fontSize:12, color:"#666"}}>
                      {new Date(item.ts).toLocaleString()} • +{item.points} pts
                    </div>
                    <p style={{fontSize:13, marginTop:8, whiteSpace:"pre-wrap"}}>
                      {item.content.length > 220 ? item.content.slice(0,220) + "…" : item.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={card}>
            <h3 style={h2}>Your Bookshelf</h3>
            {bookshelf.length===0 ? (
              <div style={{fontSize:14, color:"#666"}}>Save a few books to see them here.</div>
            ) : (
              <ul style={{display:"grid", gap:8}}>
                {bookshelf.map(b=> (
                  <li key={b.id} style={{border:"1px solid #eee", borderRadius:12, padding:12}}>
                    <div style={{fontWeight:500}}>{b.title}</div>
                    <div style={{fontSize:12, color:"#666"}}>{findAuthor(b.authorId)?.name}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={card}>
            <h3 style={h2}>Share Feedback → Earn Points</h3>
            <label style={{display:"block", fontSize:12, marginBottom:4}}>Aha! Moment (+10)</label>
            <textarea value={feedback.aha} onChange={e=>setFeedback(f=>({...f, aha:e.target.value}))} style={{width:"100%", border:"1px solid #ddd", borderRadius:12, padding:8, fontSize:14, marginBottom:8}} />
            <label style={{display:"block", fontSize:12, marginBottom:4}}>Breakthrough (+25)</label>
            <textarea value={feedback.breakthrough} onChange={e=>setFeedback(f=>({...f, breakthrough:e.target.value}))} style={{width:"100%", border:"1px solid #ddd", borderRadius:12, padding:8, fontSize:14, marginBottom:8}} />
            <label style={{display:"block", fontSize:12, marginBottom:4}}>Favorite Part (+5)</label>
            <textarea value={feedback.favorite} onChange={e=>setFeedback(f=>({...f, favorite:e.target.value}))} style={{width:"100%", border:"1px solid #ddd", borderRadius:12, padding:8, fontSize:14, marginBottom:12}} />
            <button onClick={submitFeedback} style={{width:"100%", padding:"10px 12px", borderRadius:12, background:"#111", color:"#fff"}}>Submit & Earn</button>
          </div>
        </section>
      </main>

      {/* Register modal */}
      {showRegister && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Please register"
          style={{
            position:"fixed",
            inset:0,
            background:"rgba(0,0,0,0.4)",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            zIndex:50
          }}
        >
          <div
            style={{
              background:"#fff",
              borderRadius:16,
              padding:20,
              width:360,
              boxShadow:"0 10px 30px rgba(0,0,0,0.2)",
              border:"1px solid #eee"
            }}
          >
            <div style={{fontWeight:700, fontSize:18, marginBottom:8}}>Please register</div>
            <p style={{fontSize:14, color:"#555", marginBottom:16}}>
              Side quests and missions require an account. Create one to complete quests and earn points.
            </p>
            <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
              <button
                onClick={()=>setShowRegister(false)}
                style={{padding:"8px 12px", borderRadius:10, border:"1px solid #ddd", background:"#fff"}}
              >
                Close
              </button>
              <button
                disabled
                title="Not available in prototype"
                style={{padding:"8px 12px", borderRadius:10, background:"#111", color:"#fff", opacity:0.5, cursor:"not-allowed"}}
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={{maxWidth:1200, margin:"0 auto", padding:16, fontSize:12, color:"#666"}}>
        Prototype • Emotional keyword matching • Quests (registration required) • Perks • Wallet • Community Feed
      </footer>
    </div>
  );
}
