import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home/Home';
import CreatePOLL from './pages/CreatePoll/CreatePoll';
import Poll from './pages/Poll/Poll';

const AppRoutes = () => (
    <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreatePOLL />} />
        <Route path="/poll/:code" element={<Poll />} />
    </Routes>
);

export default AppRoutes;
