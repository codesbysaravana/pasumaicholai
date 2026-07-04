import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  acceptDeliveryJob,
  getAssignedDeliveries,
  getAvailableDeliveries,
  updateDeliveryStatus,
  type DeliveryOrderRecord,
  type DeliveryStatus,
} from "../../api/orderApi";
import { DashboardLayout } from "../../components/layout/DashboardLayout";

const deliveryItems = [
  { label: "Overview", href: "/dashboard/delivery" },
  { label: "Tasks", href: "/dashboard/delivery" },
  { label: "Contacts", href: "/dashboard/delivery" },
  { label: "Farm Map", href: "/delivery/farm-map" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export function DeliveryDashboard() {
  const [available, setAvailable] = useState<DeliveryOrderRecord[]>([]);
  const [assigned, setAssigned] = useState<DeliveryOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [availableData, assignedData] = await Promise.all([getAvailableDeliveries(), getAssignedDeliveries()]);
      setAvailable(availableData);
      setAssigned(assignedData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load deliveries.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const assignJob = async (orderId: string) => {
    setActionOrderId(orderId);
    setError(null);
    try {
      await acceptDeliveryJob(orderId);
      await load();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Failed to accept delivery.");
    } finally {
      setActionOrderId(null);
    }
  };

  const nextStatuses = (status: DeliveryStatus): DeliveryStatus[] => {
    if (status === "PICKED_UP") return ["OUT_FOR_DELIVERY"];
    if (status === "OUT_FOR_DELIVERY") return ["DELIVERED"];
    return [];
  };

  const updateStatus = async (orderId: string, deliveryStatus: DeliveryStatus) => {
    setActionOrderId(orderId);
    setError(null);
    try {
      await updateDeliveryStatus(orderId, deliveryStatus);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update delivery status.");
    } finally {
      setActionOrderId(null);
    }
  };

  const activeAssigned = useMemo(
    () => assigned.filter((item) => item.deliveryStatus !== "DELIVERED"),
    [assigned],
  );

  const completedAssigned = useMemo(
    () => assigned.filter((item) => item.deliveryStatus === "DELIVERED"),
    [assigned],
  );

  return (
    <DashboardLayout title="Delivery Overview" items={deliveryItems}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="dashboard-page stack"
        style={{ gap: "1rem" }}
      >
        <motion.article variants={itemVariants} className="card">
          <h2>Delivery Workflow</h2>
          <p className="muted">Accept pickup jobs and update delivery lifecycle status.</p>
        </motion.article>

        {isLoading ? <div className="card loader">Loading deliveries...</div> : null}
        {error ? <div className="card experts-error">{error}</div> : null}

        {!isLoading ? (
          <motion.article variants={itemVariants} className="card experts-table-card">
            <div className="experts-table-header">
              <h3>Available Deliveries</h3>
              <span className="tag-chip">{available.length} jobs</span>
            </div>
            {!available.length ? (
              <div className="card muted">No available pickup jobs.</div>
            ) : (
              <div className="experts-table-wrap">
                <table className="experts-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Product</th>
                      <th>Farmer</th>
                      <th>Consumer</th>
                      <th>Pickup Location</th>
                      <th>Delivery Location</th>
                      <th>Delivery Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {available.map((item) => (
                      <tr key={item.orderId}>
                        <td><code>{item.orderId}</code></td>
                        <td>{item.product}</td>
                        <td>{item.farmerName}</td>
                        <td>{item.consumerName}</td>
                        <td>{item.pickupLocation}</td>
                        <td>{item.deliveryLocation}</td>
                        <td>{item.deliveryStatus}</td>
                        <td>
                          <button
                            className="btn btn-primary"
                            disabled={actionOrderId === item.orderId}
                            onClick={() => void assignJob(item.orderId)}
                          >
                            Accept Job
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.article>
        ) : null}

        {!isLoading ? (
          <motion.article variants={itemVariants} className="card experts-table-card">
            <div className="experts-table-header">
              <h3>Assigned Deliveries</h3>
              <span className="tag-chip">{activeAssigned.length} active</span>
            </div>
            {!activeAssigned.length ? (
              <div className="card muted">No assigned active deliveries.</div>
            ) : (
              <div className="experts-table-wrap">
                <table className="experts-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Product</th>
                      <th>Farmer</th>
                      <th>Consumer</th>
                      <th>Pickup Location</th>
                      <th>Delivery Location</th>
                      <th>Delivery Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAssigned.map((item) => (
                      <tr key={item.orderId}>
                        <td><code>{item.orderId}</code></td>
                        <td>{item.product}</td>
                        <td>{item.farmerName}</td>
                        <td>{item.consumerName}</td>
                        <td>{item.pickupLocation}</td>
                        <td>{item.deliveryLocation}</td>
                        <td>{item.deliveryStatus}</td>
                        <td>
                          {nextStatuses(item.deliveryStatus).map((next) => (
                            <button
                              key={next}
                              className="btn btn-secondary"
                              disabled={actionOrderId === item.orderId}
                              onClick={() => void updateStatus(item.orderId, next)}
                            >
                              {next === "OUT_FOR_DELIVERY" ? "Mark Out For Delivery" : "Mark Delivered"}
                            </button>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.article>
        ) : null}

        {!isLoading ? (
          <motion.article variants={itemVariants} className="card experts-table-card">
            <div className="experts-table-header">
              <h3>Completed Deliveries</h3>
              <span className="tag-chip">{completedAssigned.length} completed</span>
            </div>
            {!completedAssigned.length ? (
              <div className="card muted">No delivered orders yet.</div>
            ) : (
              <div className="experts-table-wrap">
                <table className="experts-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Product</th>
                      <th>Farmer</th>
                      <th>Consumer</th>
                      <th>Delivered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedAssigned.map((item) => (
                      <tr key={item.orderId}>
                        <td><code>{item.orderId}</code></td>
                        <td>{item.product}</td>
                        <td>{item.farmerName}</td>
                        <td>{item.consumerName}</td>
                        <td>{item.deliveredAt ? new Date(item.deliveredAt).toLocaleString() : "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.article>
        ) : null}
      </motion.div>
    </DashboardLayout>
  );
}
