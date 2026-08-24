import { useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import ChatPreview from "../components/ChatPreview";
import ModePreview from "../components/ModePreview";

import Footer from "../components/Footer";


export default function AppPage(){

  const navigate = useNavigate();

  return (

    <div className="bg-black text-white min-h-screen">

      <Navbar />

      <Hero 
        onStart={() => navigate("/app")}
      />

      <Features />

      <ChatPreview />

      <ModePreview />


      <Footer />

    </div>

  )

}