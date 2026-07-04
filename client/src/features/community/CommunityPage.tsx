import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getBlogs, upvoteBlog } from "../../api/communityApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { useNotificationStore } from "../../store/notificationStore";
import type { BlogPost } from "../../types/community";
import { fadeInUp, staggerContainer } from "../../components/ui/motion";

export function CommunityPage() {
  const { t } = useTranslation();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  useEffect(() => {
    let mounted = true;

    async function loadBlogs() {
      const data = await getBlogs();
      if (mounted) {
        setBlogs(data);
        setLoading(false);
      }
    }

    void loadBlogs();
    return () => {
      mounted = false;
    };
  }, []);

  const handleUpvote = async (blogId: string) => {
    await upvoteBlog(blogId);
    setBlogs((current) =>
      current.map((blog) => (blog.id === blogId ? { ...blog, upvotes: blog.upvotes + 1 } : blog)),
    );
    pushNotification(t("community.notifications.upvoted"), "success");
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <motion.section className="community-page" variants={staggerContainer} initial="hidden" animate="visible">
      <div className="page-header page-header-rich">
        <h1>{t("community.title")}</h1>
        <Link to="/community/create">{t("community.createPost")}</Link>
      </div>
      <motion.p className="section-lead" variants={fadeInUp}>
        {t("community.subtitle")}
      </motion.p>
      <motion.div className="tag-row" variants={fadeInUp}>
        <span className="tag-chip">{t("community.tags.farming")}</span>
        <span className="tag-chip">{t("community.tags.soil")}</span>
        <span className="tag-chip">{t("community.tags.market")}</span>
      </motion.div>
      <motion.div className="grid grid-2" variants={staggerContainer}>
        {blogs.map((blog) => (
          <Card key={blog.id} title={blog.title}>
            <p>{blog.content}</p>
            <p>
              {t("community.by")} {blog.authorName}
            </p>
            <p>
              {t("community.upvotes")}: {blog.upvotes}
            </p>
            <div className="inline-actions">
              <Link to={`/community/${blog.id}`}>{t("community.readMore")}</Link>
              <Button variant="secondary" onClick={() => void handleUpvote(blog.id)}>
                {t("community.upvote")}
              </Button>
            </div>
          </Card>
        ))}
      </motion.div>
    </motion.section>
  );
}
