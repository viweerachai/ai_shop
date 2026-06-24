type StrategyTask = {
  taskId: string;
  actionId: string;
  title: string;
  owner: "CEO" | "Marketing" | "Manager" | "Owner";
  status: "open" | "done" | "canceled";
  source: "sales" | "content" | "promotion" | "operations";
  detail: string;
  sku?: string;
  createdAt: string;
  updatedAt: string;
};

type StrategyHistory = {
  historyId: string;
  actionId: string;
  title: string;
  transition: "started" | "completed" | "reset" | "status_changed";
  fromStatus: "ready" | "in_progress" | "completed" | "watch" | "blocked" | "none";
  toStatus: "ready" | "in_progress" | "completed" | "watch" | "blocked" | "none";
  createdAt: string;
  note: string;
};

function transitionLabel(value: StrategyHistory["transition"]) {
  return value === "started"
    ? "started"
    : value === "completed"
    ? "completed"
    : value === "reset"
    ? "reset"
    : "changed";
}

export function StrategyActionActivity({
  tasks,
  history
}: {
  tasks: StrategyTask[];
  history: StrategyHistory[];
}) {
  return (
    <div className="strategy-activity-grid">
      <div className="activity-box">
        <div className="instruction-title"><strong>Active Tasks</strong><span>{tasks.length}</span></div>
        <div className="activity-list">
          {tasks.length
            ? tasks.map((task) => (
              <div className={`activity-item status-${task.status}`} key={task.taskId}>
                <strong>{task.title}</strong>
                <span>{task.owner}{task.sku ? ` • ${task.sku}` : ""}</span>
                <small>{task.detail}</small>
              </div>
            ))
            : <div className="empty-state">ยังไม่มี task ที่ถูกสร้างจาก action</div>}
        </div>
      </div>
      <div className="activity-box">
        <div className="instruction-title"><strong>Recent History</strong><span>{history.length}</span></div>
        <div className="activity-list">
          {history.length
            ? history.slice(0, 6).map((item) => (
              <div className="activity-item history" key={item.historyId}>
                <strong>{item.title}</strong>
                <span>{transitionLabel(item.transition)} • {item.toStatus}</span>
                <small>{item.note}</small>
              </div>
            ))
            : <div className="empty-state">ยังไม่มีประวัติ action</div>}
        </div>
      </div>
    </div>
  );
}
