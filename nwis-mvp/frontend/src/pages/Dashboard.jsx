import { Link } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import WellMap from "../components/Map/WellMap";

const events = [["Pressure review", "Pending"], ["Formation marker", "Recorded"], ["Mud-weight check", "Pending"]];
const depthTrend = [{ depth: 0, value: 0 }, { depth: 1, value: 26 }, { depth: 2, value: 51 }, { depth: 3, value: 73 }, { depth: 4, value: 92 }];

export default function Dashboard() {
	return (
		<section className="page-content">
			<div className="page-heading"><div><p className="eyebrow">Operations overview</p><h1>eRTMAC-NWIS</h1><p className="muted">Nearby and offset well intelligence workspace</p></div><Link className="button" to="/well/NWIS-001">Open current well</Link></div>
			<div className="metric-grid">
				<article className="metric-card"><span>Current well</span><strong>NWIS-001</strong><small>Placeholder well</small></article>
				<article className="metric-card"><span>Current depth</span><strong>2,840 m</strong><small>Awaiting live feed</small></article>
				<article className="metric-card"><span>Formation</span><strong>Upper target</strong><small>Placeholder interpretation</small></article>
				<article className="metric-card risk-card"><span>Risk summary</span><strong>Review required</strong><small>Decision model not connected</small></article>
			</div>
			<div className="dashboard-grid">
				<article className="panel map-panel"><div className="panel-heading"><h2>Well map</h2><span className="status">Placeholder data</span></div><WellMap /></article>
				<article className="panel"><div className="panel-heading"><h2>Similar wells</h2><span className="status">Not available</span></div><p className="empty-state">Similarity engine will be connected in a future phase.</p></article>
				<article className="panel"><div className="panel-heading"><h2>Historical events</h2><span className="status">3 records</span></div><table><tbody>{events.map(([event, status]) => <tr key={event}><td>{event}</td><td><span className="tag">{status}</span></td></tr>)}</tbody></table></article>
				<article className="panel"><div className="panel-heading"><h2>Depth trend</h2><span className="status">Placeholder</span></div><div className="trend-chart"><ResponsiveContainer width="100%" height={150}><LineChart data={depthTrend}><XAxis dataKey="depth" tick={{ fontSize: 11 }} /><YAxis hide /><Tooltip /><Line type="monotone" dataKey="value" stroke="#b35d24" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></article>
				<article className="panel assistant-panel"><div className="panel-heading"><h2>AI assistant</h2><span className="status">Offline</span></div><p className="empty-state">RAG query support will appear here after document retrieval is added.</p></article>
			</div>
		</section>
	);
}
