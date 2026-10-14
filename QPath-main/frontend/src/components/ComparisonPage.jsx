import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { BarChart3, Activity, Cpu, Zap, Table, TrendingDown, Layers, Play } from 'lucide-react';

export default function ComparisonPage({
  comparison = [],
  onRunComparison,
  loading,
  params,
  setParams
}) {
  const [activeTab, setActiveTab] = useState('table'); // 'table' | 'charts' | 'scalability'

  // Colors for algorithms
  const ALGO_COLORS = {
    QPSO: '#2563eb',
    PSO: '#059669',
    GENETIC: '#d97706',
    DIJKSTRA: '#dc2626',
    'OR-TOOLS': '#7c3aed'
  };

  // Format data for Recharts Bar Charts
  const chartData = comparison.map(c => ({
    name: (c.algorithm || 'Algo').toUpperCase(),
    travelTime: c.total_travel_time != null ? Number(c.total_travel_time.toFixed(1)) : 0,
    distance: c.total_distance != null ? Number(c.total_distance.toFixed(1)) : 0,
    opCost: c.total_op_cost != null ? Number(c.total_op_cost.toFixed(0)) : 0,
    computeTime: c.compute_time != null ? Number((c.compute_time * 1000).toFixed(1)) : 0, // ms
    fitness: c.fitness != null ? Number(c.fitness.toFixed(2)) : 0
  }));

  // Build convergence data
  let convergenceData = [];
  if (comparison && comparison.length > 0) {
    let maxLen = 0;
    comparison.forEach(r => {
      const conv = r.convergence || (r.convergence_data ? r.convergence_data.map(c => c.fitness) : null);
      if (conv && conv.length > maxLen) maxLen = conv.length;
    });

    for (let i = 0; i < maxLen; i++) {
      let pt = { iteration: i };
      comparison.forEach(r => {
        const conv = r.convergence || (r.convergence_data ? r.convergence_data.map(c => c.fitness) : null);
        const name = (r.algorithm || 'algo').toUpperCase();
        if (conv && conv.length > 0) {
          pt[name] = i < conv.length ? conv[i] : conv[conv.length - 1];
        }
      });
      convergenceData.push(pt);
    }
  }

  // Find QPSO result for genuine comparative advantage (NO MOCK DATA FALLBACKS)
  const qpsoResult = comparison.find(c => (c.algorithm || '').toUpperCase() === 'QPSO');
  const dijkstraResult = comparison.find(c => (c.algorithm || '').toUpperCase() === 'DIJKSTRA');

  const qpsoTimeSavings = (qpsoResult && dijkstraResult && dijkstraResult.total_travel_time > 0)
    ? (((dijkstraResult.total_travel_time - qpsoResult.total_travel_time) / dijkstraResult.total_travel_time) * 100).toFixed(1)
    : null;

  const qpsoCostSavings = (qpsoResult && dijkstraResult && dijkstraResult.total_op_cost > 0)
    ? (((dijkstraResult.total_op_cost - qpsoResult.total_op_cost) / dijkstraResult.total_op_cost) * 100).toFixed(1)
    : null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      gap: '14px',
      padding: '16px',
      background: 'var(--bg-canvas, #0f141c)',
      color: 'var(--text-primary, #f8fafc)'
    }}>
      
      {/* Top Banner with Action & Sub-Tabs */}
      <div style={{
        background: 'var(--bg-surface, #171d28)',
        border: '1px solid var(--border-subtle, #242e3f)',
        borderRadius: '6px',
        padding: '14px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} style={{ color: 'var(--color-primary, #2563eb)' }} />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
              Optimization Benchmark Matrix & Telemetry
            </h2>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            Multi-objective empirical evaluation: <strong>QPSO</strong> vs. <strong>Classical PSO</strong>, <strong>Genetic Algorithm</strong>, <strong>Dijkstra</strong>, and <strong>Google OR-Tools</strong>.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Sub-tab view buttons */}
          <div style={{ display: 'flex', background: 'var(--bg-canvas, #0f141c)', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-subtle, #242e3f)' }}>
            {[
              { id: 'table', label: 'Benchmark Table', icon: Table },
              { id: 'charts', label: 'Convergence & Plots', icon: Activity },
              { id: 'scalability', label: 'Complexity & Theory', icon: Cpu },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '3px',
                  border: 'none',
                  background: activeTab === id ? 'var(--bg-surface, #171d28)' : 'transparent',
                  color: activeTab === id ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #64748b)',
                  fontSize: '11px',
                  fontWeight: activeTab === id ? 600 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Icon size={12} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onRunComparison}
            disabled={loading}
            style={{
              padding: '7px 14px',
              borderRadius: '4px',
              border: 'none',
              background: 'var(--color-primary, #2563eb)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Zap size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Evaluating...' : 'Re-Run All Algorithms'}</span>
          </button>
        </div>
      </div>

      {/* Real Empirical Advantage Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'var(--bg-surface, #171d28)', border: '1px solid var(--border-subtle, #242e3f)', borderRadius: '6px', padding: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>QPSO time advantage</div>
          <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: qpsoTimeSavings ? 'var(--color-info, #0284c7)' : 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            {qpsoTimeSavings ? `+${qpsoTimeSavings}% Faster` : '—'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            {qpsoTimeSavings ? 'vs. Greedy Dijkstra baseline' : 'Awaiting benchmark run'}
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface, #171d28)', border: '1px solid var(--border-subtle, #242e3f)', borderRadius: '6px', padding: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Fleet cost reduction</div>
          <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: qpsoCostSavings ? 'var(--color-success, #10b981)' : 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            {qpsoCostSavings ? `+${qpsoCostSavings}% Saved` : '—'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            {qpsoCostSavings ? 'Fuel & operational wear efficiency' : 'Awaiting benchmark run'}
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface, #171d28)', border: '1px solid var(--border-subtle, #242e3f)', borderRadius: '6px', padding: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Hardware feasibility</div>
          <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary, #f8fafc)', marginTop: '2px' }}>
            Classical CPU
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>Zero cryogenic QPU required</div>
        </div>

        <div style={{ background: 'var(--bg-surface, #171d28)', border: '1px solid var(--border-subtle, #242e3f)', borderRadius: '6px', padding: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Tunneling mechanism</div>
          <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-warning, #f59e0b)', marginTop: '2px' }}>
            Delta Potential
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>Escapes local traffic minima</div>
        </div>
      </div>

      {/* VIEW 1: COMPARISON TABLE */}
      {activeTab === 'table' && (
        <div style={{ background: 'var(--bg-surface, #171d28)', border: '1px solid var(--border-subtle, #242e3f)', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle, #242e3f)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
              Benchmark Execution Matrix
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontFamily: 'var(--font-mono)' }}>
              F(R) = 0.35 T + 0.25 D + 0.25 C + 0.15 O
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-canvas, #0f141c)', borderBottom: '1px solid var(--border-subtle, #242e3f)' }}>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted, #64748b)', fontSize: '10px', fontWeight: 600 }}>Algorithm</th>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted, #64748b)', fontSize: '10px', fontWeight: 600 }}>Travel time</th>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted, #64748b)', fontSize: '10px', fontWeight: 600 }}>Distance</th>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted, #64748b)', fontSize: '10px', fontWeight: 600 }}>Congestion</th>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted, #64748b)', fontSize: '10px', fontWeight: 600 }}>Fleet cost</th>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted, #64748b)', fontSize: '10px', fontWeight: 600 }}>Compute time</th>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted, #64748b)', fontSize: '10px', fontWeight: 600 }}>Iterations</th>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted, #64748b)', fontSize: '10px', fontWeight: 600 }}>Fitness F(R)</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, idx) => {
                  const algoName = (row.algorithm || `Algo ${idx+1}`).toUpperCase();
                  const isQpso = algoName === 'QPSO';

                  return (
                    <tr
                      key={idx}
                      style={{
                        background: isQpso ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                        borderBottom: '1px solid var(--border-subtle, #242e3f)'
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: isQpso ? 'var(--color-primary, #2563eb)' : 'var(--text-primary, #f8fafc)', fontWeight: 600 }}>
                        {algoName} {isQpso && '★'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
                        {row.total_travel_time != null ? `${Number(row.total_travel_time).toFixed(1)} m` : '-'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
                        {row.total_distance != null ? `${Number(row.total_distance).toFixed(2)} km` : '-'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
                        {row.total_congestion != null ? Number(row.total_congestion).toFixed(2) : '-'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
                        {row.total_op_cost != null ? `₹${Number(row.total_op_cost).toFixed(0)}` : '-'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
                        {row.compute_time != null ? `${Number(row.compute_time).toFixed(3)}s` : '-'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
                        {row.convergence?.length || row.metrics?.convergence_iterations || (algoName === 'DIJKSTRA' ? '1' : '-')}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isQpso ? 'var(--color-success, #10b981)' : 'var(--text-primary, #f8fafc)' }}>
                        {row.fitness != null ? Number(row.fitness).toFixed(2) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: CONVERGENCE & BAR CHARTS */}
      {activeTab === 'charts' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          
          {/* Convergence Curve Chart */}
          <div style={{ background: 'var(--bg-surface, #171d28)', border: '1px solid var(--border-subtle, #242e3f)', borderRadius: '6px', padding: '14px', gridColumn: 'span 2' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
              Swarm Convergence Trajectory (Fitness vs. Iteration Step)
            </h3>
            <div style={{ height: '240px', width: '100%' }}>
              <ResponsiveContainer>
                <LineChart data={convergenceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242e3f" />
                  <XAxis dataKey="iteration" stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#171d28', border: '1px solid #334158', borderRadius: '4px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {comparison.map(r => {
                    const name = (r.algorithm || 'algo').toUpperCase();
                    return (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={ALGO_COLORS[name] || '#60a5fa'}
                        dot={false}
                        strokeWidth={name === 'QPSO' ? 2.5 : 1.2}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Travel Time Comparison Bar Chart */}
          <div style={{ background: 'var(--bg-surface, #171d28)', border: '1px solid var(--border-subtle, #242e3f)', borderRadius: '6px', padding: '14px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
              Total Travel Time (Minutes — Lower is Better)
            </h3>
            <div style={{ height: '200px', width: '100%' }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242e3f" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#171d28', border: '1px solid #334158', borderRadius: '4px', fontSize: '11px' }} />
                  <Bar dataKey="travelTime" fill="#2563eb" radius={[2, 2, 0, 0]} name="Travel Time (min)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Operational Cost Comparison Bar Chart */}
          <div style={{ background: 'var(--bg-surface, #171d28)', border: '1px solid var(--border-subtle, #242e3f)', borderRadius: '6px', padding: '14px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
              Fleet Operational Cost (₹ INR — Lower is Better)
            </h3>
            <div style={{ height: '200px', width: '100%' }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242e3f" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#171d28', border: '1px solid #334158', borderRadius: '4px', fontSize: '11px' }} />
                  <Bar dataKey="opCost" fill="#059669" radius={[2, 2, 0, 0]} name="Op Cost (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 3: THEORY & COMPLEXITY */}
      {activeTab === 'scalability' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: 'var(--bg-surface, #171d28)', border: '1px solid var(--border-subtle, #242e3f)', borderRadius: '6px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary, #2563eb)' }}>
              Quantum-Inspired Position Update Formulation
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0 }}>
                Classical PSO updates velocities using Newtonian acceleration vectors, prone to premature convergence in deep local minima during sudden traffic gridlock.
              </p>
              <div style={{ background: 'var(--bg-canvas, #0f141c)', padding: '8px 12px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#60a5fa', border: '1px solid var(--border-subtle, #242e3f)' }}>
                x(t+1) = p ± β · |m_best - x(t)| · ln(1 / u)
              </div>
              <p style={{ margin: 0 }}>
                In QPSO, particles are modeled as wave packets in a delta-potential attractor well centered at attractor $p$. The wave function allows non-zero probability of tunneling across high-congestion barriers to globally superior routes.
              </p>
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface, #171d28)', border: '1px solid var(--border-subtle, #242e3f)', borderRadius: '6px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-success, #10b981)' }}>
              Algorithmic Complexity & Classical Execution
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>• <strong>Computational Complexity:</strong> O(T × N × D) where T = Iterations, N = Swarm Particles, D = Deliveries.</div>
              <div>• <strong>Spatial Memory:</strong> O(N × D) — light footprint suitable for edge dispatchers.</div>
              <div>• <strong>Classical CPU Portability:</strong> 100% executable on commodity multi-core hardware without requiring quantum co-processors.</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
