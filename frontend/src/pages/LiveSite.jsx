// PATH: frontend/src/pages/LiveSite.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const LiveSite = () => {
  const { slug } = useParams();
  const [website, setWebsite] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadWebsite = async () => {
      try {
        const result = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/website/site/${slug}`,
        );
        setWebsite(result.data);
      } catch (error) {
        setError(error.response?.data?.message || "Website not found");
      }
    };

    loadWebsite();
  }, [slug]);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-red-400">
        {error}
      </div>
    );
  }

  if (!website) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  return (
    <iframe
      className="w-full h-screen"
      srcDoc={website.latestCode}
      sandbox="allow-scripts allow-forms"
      title={website.title}
    />
  );
};

export default LiveSite;
