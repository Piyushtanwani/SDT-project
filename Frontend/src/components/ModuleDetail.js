import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "./AdminSlidebar";
import { ArrowLeft } from "lucide-react"; // Import back arrow icon

const ModuleDetail = () => {
  const { courseId, moduleNumber } = useParams();
  const [module, setModule] = useState(null);
  const navigate = useNavigate(); // Hook for navigation

  const apiUrl = process.env.REACT_APP_ENV === "production"
    ? process.env.REACT_APP_LIVE_API
    : process.env.REACT_APP_LOCAL_API;

  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        const response = await axios.get(`${apiUrl}/module/course/${courseId}/module/${moduleNumber}`);
        setModule(response.data);
      } catch (error) {
        console.error("Error fetching module:", error);
      }
    };

    fetchModuleData();
  }, [courseId, moduleNumber, apiUrl]);

  if (!module) return <p className="text-center text-gray-600 mt-10">Loading...</p>;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
            
            {/* Back Button */}
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" /> Back to Modules
            </button>

            <h2 className="text-2xl font-bold text-indigo-700 mb-2">
              Module {module.moduleNumber}: {module.moduleTitle}
            </h2>
            <p className="text-gray-600 text-sm">📅 Last Updated: {new Date(module.lastUpdated).toLocaleDateString()}</p>

            <h3 className="text-lg font-semibold mt-4 text-gray-800">📖 Content:</h3>
            <ul className="list-disc ml-6 text-gray-700">
              {module.content.map((item, index) => (
                <li key={index} className="mb-2">{item}</li>
              ))}
            </ul>

            {module.imageUrls?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-800">🖼️ Images:</h3>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {module.imageUrls.map((url, index) => (
                    <img key={index} src={url} alt={`Module Image ${index + 1}`} className="rounded-lg shadow-md" />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleDetail;
