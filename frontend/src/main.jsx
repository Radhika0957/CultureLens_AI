import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Archive, ArrowRight, Check, ChevronDown, CircleHelp, CloudUpload, Compass, Download, Image as ImageIcon, LoaderCircle, MapPin, Search, ShieldCheck, Sparkles, Tag, Trash2, UploadCloud, WandSparkles, X } from 'lucide-react'
import './style.css'

const API = 'http://localhost:8000'
const sample = [
  { id:'sample1', title:'Traditional performance', region:'Karnataka, India', year:'Unknown', description:'Example archive card. Upload your own image to generate real model suggestions.', tags:['Traditional dance performance','Traditional Indian clothing','Cultural celebration'], image_url:'', created_at:'', reviewed:false, demo:true },
  { id:'sample2', title:'Historic architecture', region:'India', year:'Unknown', description:'Example archive card to preview the gallery layout.', tags:['Temple architecture','Historic building','Sculpture'], image_url:'', created_at:'', reviewed:false, demo:true },
  { id:'sample3', title:'Traditional craft', region:'South India', year:'Unknown', description:'Example archive card to preview the gallery layout.', tags:['Traditional craft','Handmade object','Museum artifact'], image_url:'', created_at:'', reviewed:false, demo:true },
]
function App() {
  const [tab, setTab] = useState('Overview')
  const [records, setRecords] = useState([])
  const [q, setQ] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [title, setTitle] = useState('')
  const [region, setRegion] = useState('')
  const [year, setYear] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState(null)
  const [editTags, setEditTags] = useState('')
  const [backendOk, setBackendOk] = useState(false)

  async function refresh() {
    try {
      const [health, data] = await Promise.all([fetch(`${API}/api/health`), fetch(`${API}/api/archive`)])
      setBackendOk(health.ok)
      if (data.ok) setRecords(await data.json())
    } catch { setBackendOk(false) }
  }
  useEffect(() => { refresh() }, [])
  const visibleRecords = useMemo(() => {
    const list = records.length ? records : sample
    return list.filter(r => `${r.title} ${r.region} ${r.description} ${r.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  }, [records, q])
  const totalTags = records.reduce((n, r) => n + (r.tags?.length || 0), 0)
  const regions = new Set(records.map(r => r.region).filter(Boolean)).size

  function onFile(f) {
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('Please choose an image. Video processing is a future extension.'); return }
    setFile(f); setPreview(URL.createObjectURL(f)); setError(''); setNotice('')
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
  }
  async function analyze(e) {
    e.preventDefault()
    if (!file) { setError('Choose a heritage image first.'); return }
    setLoading(true); setError(''); setNotice('')
    const body = new FormData()
    body.append('file', file); body.append('title', title); body.append('region', region); body.append('year', year); body.append('description', description)
    try {
      const res = await fetch(`${API}/api/tag`, { method:'POST', body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Could not analyze image.')
      setNotice('AI tags generated and saved to your archive.')
      setSelected(data); setEditTags(data.tags.join(', ')); setTab('Archive'); await refresh()
      setFile(null); setPreview('')
    } catch (err) { setError(backendOk ? err.message : 'Backend not connected. Start the FastAPI server using the README instructions, then try again.') }
    finally { setLoading(false) }
  }
  async function saveEdits() {
    if (!selected || selected.demo) return
    const tags = editTags.split(',').map(s => s.trim()).filter(Boolean)
    try {
      const res = await fetch(`${API}/api/archive/${selected.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ tags, reviewed:true }) })
      if (!res.ok) throw new Error('Could not save changes')
      const updated = await res.json(); setSelected(updated); setNotice('Tags reviewed and saved.'); await refresh()
    } catch { setError('Could not save. Check that the backend is running.') }
  }
  async function removeRecord(r) {
    if (r.demo) return
    if (!confirm(`Delete "${r.title}" from the archive?`)) return
    try { await fetch(`${API}/api/archive/${r.id}`, { method:'DELETE' }); setSelected(null); await refresh() }
    catch { setError('Could not delete this item.') }
  }
  async function exportJson() {
    let data = records
    if (!data.length) data = sample.map(({demo, ...r}) => r)
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'})
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'culturelens-archive.json'; a.click(); URL.revokeObjectURL(url)
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={21}/></div><div><b>CultureLens</b><small>HERITAGE INTELLIGENCE</small></div></div>
      <div className="side-label">WORKSPACE</div>
      {[
        ['Overview', Compass], ['AI Tag Studio', WandSparkles], ['Explore Archive', Archive]
      ].map(([name, Icon]) => <button key={name} className={`nav-item ${tab===name?'active':''}`} onClick={() => {setTab(name); setError(''); setNotice('')}}><Icon size={18}/><span>{name}</span>{name==='AI Tag Studio' && <span className="new-pill">AI</span>}</button>)}
      <div className="sidebar-bottom">
        <div className="open-source"><ShieldCheck size={18}/><div><b>Open by design</b><p>Built for cultural preservation and community knowledge.</p></div></div>
        <div className="user-row"><div className="avatar">CL</div><div><b>Archive workspace</b><small>{backendOk?'Backend connected':'Backend offline'}</small></div><span className={`status-dot ${backendOk?'online':''}`}></span></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="mobile-brand"><Sparkles size={19}/> CultureLens</div><div className="breadcrumb">Workspace <span>/</span> {tab}</div><div className="top-actions"><span className={`connection ${backendOk?'connected':''}`}><i></i>{backendOk?'AI service connected':'Connect backend'}</span><button className="icon-button" title="Help" onClick={() => setNotice('Upload an image, generate suggested tags, review them, and save to your archive.')}><CircleHelp size={19}/></button></div></header>

      {error && <div className="alert error"><X size={17}/>{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
      {notice && <div className="alert success"><Check size={17}/>{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}

      {tab==='Overview' && <div className="page">
        <section className="hero">
          <div className="hero-content"><div className="eyebrow"><span className="eyebrow-dot"></span> AI-POWERED CULTURAL ARCHIVE</div><h1>Every artifact has<br/>a story worth <em>keeping.</em></h1><p>Turn heritage photos into searchable cultural knowledge. Let AI suggest the tags, and let people preserve the meaning.</p><div className="hero-actions"><button className="primary" onClick={()=>setTab('AI Tag Studio')}><UploadCloud size={17}/> Tag an image <ArrowRight size={16}/></button><button className="secondary light" onClick={()=>setTab('Explore Archive')}>Explore archive</button></div><div className="hero-foot"><span><ShieldCheck size={15}/> Human-reviewed metadata</span><span><Sparkles size={15}/> Open-source AI</span></div></div>
          <div className="hero-art"><div className="orb orb1"></div><div className="orb orb2"></div><div className="art-frame"><div className="art-photo"><img src="https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=800&q=80" onError={e=>{e.currentTarget.style.display='none'}} alt="Cultural heritage example"/></div><div className="floating-tag tag-a"><span className="tag-dot gold"></span> Heritage object</div><div className="floating-tag tag-b"><span className="tag-dot mint"></span> AI suggestions <b>04</b></div><div className="scan-line"></div></div><div className="hero-stamp"><Sparkles size={14}/> CULTURE · MEMORY · PLACE</div></div>
        </section>
        <div className="section-heading"><div><div className="eyebrow muted">YOUR WORKSPACE</div><h2>Archive at a glance</h2></div><button className="text-button" onClick={()=>setTab('Explore Archive')}>View archive <ArrowRight size={15}/></button></div>
        <div className="stats-grid"><Stat icon={ImageIcon} label="Archived items" value={records.length} note="Saved in your collection"/><Stat icon={Tag} label="Tags generated" value={totalTags} note="AI-suggested keywords"/><Stat icon={MapPin} label="Regions represented" value={regions} note="Based on saved metadata"/><Stat icon={ShieldCheck} label="Reviewed items" value={records.filter(r=>r.reviewed).length} note="Verified by a contributor"/></div>
        <div className="lower-grid"><div className="panel"><div className="panel-head"><div><h3>Recently added</h3><p>Your latest heritage records</p></div><button className="icon-button" onClick={()=>setTab('Explore Archive')}><ArrowRight size={17}/></button></div>{records.slice(0,3).length ? records.slice(0,3).map(r=><RecordRow key={r.id} r={r} onClick={()=>{setSelected(r);setEditTags(r.tags.join(', '))}}/>) : <div className="empty-small"><Archive size={22}/><b>Your archive starts here</b><span>Upload an image to create your first record.</span><button className="text-button" onClick={()=>setTab('AI Tag Studio')}>Start tagging <ArrowRight size={14}/></button></div>}</div><div className="tip-card"><div className="tip-icon"><Sparkles size={19}/></div><div className="eyebrow">GOOD ARCHIVE PRACTICE</div><h3>AI suggests.<br/>People give it meaning.</h3><p>Machine-generated tags are a starting point. Add local names, context, and verified information to make each record more valuable.</p><button className="secondary" onClick={()=>setTab('AI Tag Studio')}>Try the tag studio <ArrowRight size={15}/></button></div></div>
      </div>}

      {tab==='AI Tag Studio' && <div className="page">
        <div className="page-title"><div><div className="eyebrow muted">CREATE A RECORD</div><h1>AI Tag Studio</h1><p>Upload a heritage image and let AI suggest searchable cultural labels.</p></div><span className="model-badge"><Sparkles size={14}/> CLIP vision model</span></div>
        <div className="studio-grid"><form className="panel upload-panel" onSubmit={analyze}><div className="panel-title"><div className="number-icon">01</div><div><h3>Upload your image</h3><p>JPG, PNG or WEBP · One image per record</p></div></div>
          <label className={`dropzone ${preview?'has-file':''}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onFile(e.dataTransfer.files?.[0])}}>
            {preview ? <><img className="preview-image" src={preview} alt="Selected upload"/><span className="change-file">Change image</span></> : <><div className="upload-icon"><CloudUpload size={25}/></div><b>Drop an image here</b><span>or click to browse files</span><small>Images only · Max size depends on your system</small></>}
            <input type="file" accept="image/*" onChange={e=>onFile(e.target.files?.[0])}/>
          </label>
          <div className="form-fields"><label>Record title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Village festival, circa 1980"/></label><div className="field-row"><label>Region / location<input value={region} onChange={e=>setRegion(e.target.value)} placeholder="e.g. Belagavi, Karnataka"/></label><label>Year / period<input value={year} onChange={e=>setYear(e.target.value)} placeholder="e.g. 1980s or unknown"/></label></div><label>Context notes <span className="optional">OPTIONAL</span><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="What do you know about this image? Add source or community context..." rows="3"/></label></div>
          <div className="privacy-note"><ShieldCheck size={16}/><span>AI tags are suggestions. Review cultural details before publishing.</span></div><button className="primary full" type="submit" disabled={loading}>{loading?<><LoaderCircle className="spin" size={17}/> Analyzing image...</>:<><WandSparkles size={17}/> Generate cultural tags <ArrowRight size={16}/></>}</button>
        </form>
        <div className="panel workflow-panel"><div className="panel-title"><div className="number-icon">02</div><div><h3>What happens next?</h3><p>From image to searchable archive</p></div></div><div className="workflow-list"><Workflow icon={ImageIcon} num="01" title="Visual analysis" text="The vision model compares your image with cultural and heritage-related concepts."/><Workflow icon={Tag} num="02" title="Suggested tags" text="Get ranked labels such as architecture, traditional clothing, or folk performance."/><Workflow icon={Check} num="03" title="Review & save" text="Edit tags, add local knowledge, and save the record to your collection."/></div><div className="model-note"><Sparkles size={17}/><div><b>Open-source model</b><p>CLIP matches image content against a set of candidate labels. It may miss regional context, so human review is important.</p></div></div><div className="candidate-box"><span>SUPPORTED TAG THEMES</span><div className="chips"><span>Architecture</span><span>Traditional clothing</span><span>Folk performance</span><span>Crafts</span><span>Festivals</span><span>Instruments</span></div></div></div></div>
      </div>}

      {tab==='Explore Archive' && <div className="page">
        <div className="page-title"><div><div className="eyebrow muted">DISCOVER & SEARCH</div><h1>Explore heritage</h1><p>Search saved records and discover cultural connections.</p></div><button className="secondary" onClick={exportJson}><Download size={16}/> Export JSON</button></div>
        <div className="searchbar"><Search size={19}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tags, regions, titles, or descriptions..."/>{q&&<button onClick={()=>setQ('')}><X size={16}/></button>}<span className="search-shortcut">SEARCH</span></div>
        <div className="archive-toolbar"><span>{visibleRecords.length} {visibleRecords.length===1?'record':'records'} shown</span><span><span className="tag-dot mint"></span> AI-assisted metadata</span></div>
        {visibleRecords.length ? <div className="gallery">{visibleRecords.map((r,i)=><article className="gallery-card" key={r.id} onClick={()=>{setSelected(r);setEditTags(r.tags.join(', '))}}><div className="gallery-image">{r.image_url?<img src={`${API}${r.image_url}`} alt={r.title}/>:<div className={`placeholder-art art-${i%3}`}><ImageIcon size={35}/><span>HERITAGE RECORD</span></div>}<span className="image-overlay"><ArrowRight size={17}/></span></div><div className="gallery-body"><div className="card-meta">{r.region||'Location not specified'} <span>·</span> {r.year||'Date unknown'}</div><h3>{r.title}</h3><p>{r.description||'No additional context provided yet.'}</p><div className="chips">{r.tags.slice(0,3).map(t=><span key={t}>{t}</span>)}</div><div className="card-footer"><span>{r.reviewed?<><Check size={13}/> Reviewed</> : <><Sparkles size={13}/> AI suggestions</>}</span><span>View record <ArrowRight size={13}/></span></div></div></article>)}</div> : <div className="empty-state"><Archive size={36}/><h3>No matching records</h3><p>Try another keyword or upload a heritage image to start your archive.</p><button className="primary" onClick={()=>setTab('AI Tag Studio')}>Add first record <ArrowRight size={16}/></button></div>}
        {!records.length && <p className="demo-note">Showing example cards to preview the layout. Start the backend and upload an image to create real records.</p>}
      </div>}
      <footer><span>CultureLens AI</span><span>Preserving culture through open technology</span><span>Built for Heritage Day <span className="footer-dot">✦</span></span></footer>
    </main>
    {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="detail-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}><X size={19}/></button><div className="modal-image">{selected.image_url?<img src={`${API}${selected.image_url}`} alt={selected.title}/>:<div className="placeholder-art art-1"><ImageIcon size={36}/></div>}</div><div className="modal-content"><div className="eyebrow muted">HERITAGE RECORD</div><h2>{selected.title}</h2><div className="modal-meta"><span><MapPin size={14}/>{selected.region||'Location unknown'}</span><span>{selected.year||'Date unknown'}</span></div><p>{selected.description||'No context notes added.'}</p><label className="edit-label">Tags <span>Separate with commas</span><textarea value={editTags} onChange={e=>setEditTags(e.target.value)} rows="3"/></label>{selected.scores?.length>0&&<div className="scores"><b>Model confidence (relative ranking)</b>{selected.scores.slice(0,4).map(s=><div className="score-row" key={s.label}><span>{s.label}</span><div><i style={{width:`${Math.max(2,s.score*100)}%`}}/></div><small>{Math.round(s.score*100)}%</small></div>)}</div>}<div className="modal-actions"><button className="primary" onClick={saveEdits}><Check size={16}/> Confirm tags</button>{!selected.demo&&<button className="danger" onClick={()=>removeRecord(selected)}><Trash2 size={16}/> Delete</button>}</div><small className="modal-disclaimer">AI labels are suggestions, not verified historical facts.</small></div></div></div>}
  </div>
}
function Stat({icon:Icon,label,value,note}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon size={17}/></div></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>}
function RecordRow({r,onClick}){return <button className="record-row" onClick={onClick}><div className="record-thumb">{r.image_url?<img src={`${API}${r.image_url}`} alt=""/>:<ImageIcon size={18}/>}</div><div className="record-info"><b>{r.title}</b><span>{r.tags.slice(0,2).join(' · ')}</span></div><ArrowRight size={16}/></button>}
function Workflow({icon:Icon,num,title,text}){return <div className="workflow-step"><div className="workflow-icon"><Icon size={18}/></div><div><div className="workflow-kicker">STEP {num}</div><b>{title}</b><p>{text}</p></div></div>}
createRoot(document.getElementById('root')).render(<App/>)
