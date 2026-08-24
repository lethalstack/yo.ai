import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppPage from "./pages/AppPage";
import StudyApp from "./pages/StudyApp";
import Loading from "./pages/Loading";


export default function App(){

return(

<BrowserRouter>

<Routes>

<Route path="/" element={<AppPage />} />

<Route path="/loading" element={<Loading />} />

<Route path="/app" element={<StudyApp />} />

</Routes>

</BrowserRouter>

)

}