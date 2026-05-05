import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

function App() {
  const [tasks, setTasks] = useState([]);
  const [bigRocks, setBigRocks] = useState([]);
  const [view, setView] = useState('plan'); 
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', 
    big_rock_id: '', 
    start_date: '', 
    duration_days: 14 
  });
  
  const [newRock, setNewRock] = useState({ name: '', color: '#3b82f6' });

  const fetchData = useCallback(async () => {
    const { data: rocks } = await supabase.from('big_rocks').select('*').order('id');
    const { data: items } = await supabase.from('tasks').select(`*, big_rocks (name, color)`).order('start_date');
    setBigRocks(rocks || []);
    setTasks(items || []);
    if (rocks?.length > 0 && !formData.big_rock_id) {
        setFormData(prev => ({...prev, big_rock_id: rocks[0].id}));
    }
  }, [formData.big_rock_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (view === 'plan' && tasks.length > 0 && window.Gantt) {
      const container = document.getElementById('gantt-chart');
      if (container) {
        container.innerHTML = '';
        const ganttTasks = tasks.map(t => ({
          id: String(t.id),
          name: t.name,
          start: t.start_date,
          end: (() => {
            let d = new Date(t.start_date);
            d.setDate(d.getDate() + (parseInt(t.duration_days) || 1));
            return d.toISOString().split('T')[0];
          })(),
          custom_class: `rock-id-${t.big_rock_id}`
        }));

        new window.Gantt("#gantt-chart", ganttTasks, {
          view_mode: 'Month',
          column_width: 80,
          bar_height: 35
        });
      }
    }
  }, [tasks, view]);

  const saveTask = async () => {
    if (!formData.name || !formData.start_date) return alert("Please enter Name and Date");
    const payload = { 
        name: formData.name, 
        start_date: formData.start_date,
        duration_days: parseInt(formData.duration_days), 
        big_rock_id: parseInt(formData.big_rock_id)
    };
    if (editingId) {
        await supabase.from('tasks').update(payload).eq('id', editingId);
        setEditingId(null);
    } else {
        await supabase.from('tasks').insert([payload]);
    }
    setFormData({ name: '', big_rock_id: bigRocks[0]?.id || '', start_date: '', duration_days: 14 });
    fetchData();
  };

  const startEditing = (t) => {
    setEditingId(t.id);
    setFormData({ 
        name: t.name, 
        big_rock_id: t.big_rock_id, 
        start_date: t.start_date, 
        duration_days: t.duration_days 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTask = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Delete this action?")) {
      await supabase.from('tasks').delete().eq('id', id);
      fetchData();
    }
  };

  const addBigRock = async () => {
    if (!newRock.name) return;
    await supabase.from('big_rocks').insert([newRock]);
    setNewRock({ name: '', color: '#3b82f6' });
    fetchData();
  };

  const deleteBigRock = async (id) => {
    if (window.confirm("Delete this category?")) {
      await supabase.from('big_rocks').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <header style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img 
            src="https://www.giago.com/wp-content/uploads/2022/10/Giago-Logo-Black.png" 
            alt="Giago" 
            style={{ height: '40px', width: 'auto' }} 
            onError={(e) => { 
                e.target.style.display = 'none'; // Hides broken image and stops the loading loop
            }}
          />
          <div style={{ background: '#000', height: '30px', width: '2px' }}></div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0, letterSpacing: '0.5px' }}>GIAGO LAUNCH PLANNER</h1>
        </header>

        <nav style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
          <button onClick={() => setView('plan')} style={{ padding: '10px 20px', background: view === 'plan' ? '#000' : '#fff', color: view === 'plan' ? '#fff' : '#000', border: '1px solid #000', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>📅 Roadmap</button>
          <button onClick={() => setView('settings')} style={{ padding: '10px 20px', background: view === 'settings' ? '#000' : '#fff', color: view === 'settings' ? '#fff' : '#000', border: '1px solid #000', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>⚙️ Manage Big Rocks</button>
        </nav>

        {view === 'settings' ? (
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0 }}>Configure Big Rocks</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', background: '#f1f5f9', padding: '20px', borderRadius: '8px' }}>
              <input type="text" placeholder="Category Name" value={newRock.name} onChange={e => setNewRock({...newRock, name: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              <input type="color" value={newRock.color} onChange={e => setNewRock({...newRock, color: e.target.value})} style={{ width: '50px', height: '40px', border: 'none', background: 'none', cursor: 'pointer' }} />
              <button onClick={addBigRock} style={{ padding: '10px 20px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add Category</button>
            </div>
            {bigRocks.map(rock => (
              <div key={rock.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '16px', height: '16px', background: rock.color, borderRadius: '50%' }}></div>
                    <span style={{ fontWeight: 'bold' }}>{rock.name}</span>
                </div>
                <button onClick={() => deleteBigRock(rock.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Remove</button>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Action Item</label>
                  <input type="text" placeholder="e.g. Press Release" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Category</label>
                  <select value={formData.big_rock_id} onChange={e => setFormData({...formData, big_rock_id: e.target.value})} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}>
                    {bigRocks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Start Date</label>
                  <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Duration (Days)</label>
                  <input type="number" value={formData.duration_days} onChange={e => setFormData({...formData, duration_days: e.target.value})} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <button onClick={saveTask} style={{ height: '43px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {editingId ? "Update Task" : "Add Task"}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px', overflow: 'hidden' }}>
              <div id="gantt-chart"></div>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              {tasks.map(t => (
                <div key={t.id} onClick={() => startEditing(t)} style={{ 
                  display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#fff', 
                  borderRadius: '8px', cursor: 'pointer', 
                  borderLeft: `6px solid ${t.big_rocks?.color || '#000'}`,
                  boxShadow: editingId === t.id ? '0 0 0 2px #000' : '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{t.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {t.big_rocks?.name} | {t.start_date} ({t.duration_days} days)
                    </div>
                  </div>
                  <button onClick={(e) => deleteTask(e, t.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
                </div>
              ))}
            </div>
          </>
        )}

        <style>{`
          .bar-label { fill: #333; font-weight: bold; font-size: 12px; }
          ${bigRocks.map(r => `.rock-id-${r.id} .bar { fill: ${r.color} !important; rx: 4; }`).join('\n')}
        `}</style>
      </div>
    </div>
  );
}

export default App;