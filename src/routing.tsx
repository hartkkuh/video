import { Navigate, Route, Routes } from "react-router-dom";
import Player from "./pages/player/player";
import SettingsPage from "./pages/settings/settings";
import EffectsPage from "./pages/effects/effects";
import MediaDetailsPage from "./pages/media_details/media-details";

export default function Routing() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/player" replace />} />
            <Route path="/player" element={<Player />} />
            <Route path="/effects" element={<EffectsPage />} />
            <Route path="/media" element={<MediaDetailsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
        </Routes>
    );
}
