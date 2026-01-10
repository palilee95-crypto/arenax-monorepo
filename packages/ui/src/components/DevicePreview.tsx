"use client";

import React, { useState, useEffect } from "react";

interface DevicePreviewProps {
    children: React.ReactNode;
}

type DeviceView = "pc" | "ipad" | "iphone";

export const DevicePreview = ({ children }: DevicePreviewProps) => {
    const [view, setView] = useState<DeviceView>("pc");
    const [mounted, setMounted] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    useEffect(() => {
        // Robust check if we are inside an iframe
        if (window.self !== window.top) {
            setIsPreviewMode(true);
        }

        const savedView = localStorage.getItem("arenax_device_view") as DeviceView;
        const params = new URLSearchParams(window.location.search);
        if (savedView && !params.get("preview")) {
            setView(savedView);
        }
        setMounted(true);
    }, []);

    const handleViewChange = (newView: DeviceView) => {
        setView(newView);
        localStorage.setItem("arenax_device_view", newView);
    };

    if (!mounted) return null;

    // If we are inside the iframe, just render the content without the switcher or frame
    if (isPreviewMode) {
        return <>{children}</>;
    }

    const getDeviceDimensions = () => {
        switch (view) {
            case "ipad":
                return { width: 768, height: 1024 };
            case "iphone":
                return { width: 390, height: 844 };
            default:
                return null;
        }
    };

    const dimensions = getDeviceDimensions();

    return (
        <div className={`device-preview-root ${view}`} style={{
            background: view === "pc" ? "transparent" : "#0a0a0c",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            transition: "all 0.3s ease",
            overflow: view === "pc" ? "visible" : "hidden"
        }}>
            {/* Floating Switcher */}
            <div className="device-switcher" style={{
                position: "fixed",
                bottom: "20px",
                right: "20px",
                zIndex: 10000,
                background: "rgba(0,0,0,0.8)",
                backdropFilter: "blur(10px)",
                padding: "5px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                gap: "5px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
            }}>
                {(["pc", "ipad", "iphone"] as DeviceView[]).map((v) => (
                    <button
                        key={v}
                        onClick={() => handleViewChange(v)}
                        style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: view === v ? "#009e60" : "#fff",
                            background: view === v ? "rgba(0,158,96,0.1)" : "transparent",
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            textTransform: "uppercase"
                        }}
                    >
                        {v}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {view === "pc" ? (
                <div className="pc-content" style={{ width: "100%", minHeight: "100vh" }}>
                    {children}
                </div>
            ) : (
                <div className="device-frame-container" style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "40px 20px",
                    overflow: "auto"
                }}>
                    <div className="device-frame" style={{
                        width: `${dimensions?.width}px`,
                        height: `${dimensions?.height}px`,
                        background: "#000",
                        borderRadius: view === "ipad" ? "30px" : "45px",
                        border: "12px solid #1a1a1a",
                        boxShadow: "0 0 100px rgba(0,0,0,0.8), 0 0 20px rgba(0,158,96,0.1)",
                        position: "relative",
                        overflow: "hidden",
                        flexShrink: 0
                    }}>
                        {/* Device Notch/Bezel details */}
                        {view === "iphone" && (
                            <div style={{
                                position: "absolute",
                                top: 0,
                                left: "50%",
                                transform: "translateX(-50%)",
                                width: "150px",
                                height: "30px",
                                background: "#1a1a1a",
                                borderBottomLeftRadius: "20px",
                                borderBottomRightRadius: "20px",
                                zIndex: 100
                            }} />
                        )}

                        <iframe
                            src={`${window.location.pathname}${window.location.search}${window.location.search ? '&' : '?'}preview=true`}
                            style={{
                                width: "100%",
                                height: "100%",
                                border: "none",
                                background: "#000"
                            }}
                            title={`ArenaX ${view} Preview`}
                        />
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                body {
                    margin: 0;
                    padding: 0;
                }
                .device-frame-container::-webkit-scrollbar {
                    width: 8px;
                }
                .device-frame-container::-webkit-scrollbar-track {
                    background: #0a0a0c;
                }
                .device-frame-container::-webkit-scrollbar-thumb {
                    background: #1a1a1a;
                    border-radius: 10px;
                }
                .device-frame-container::-webkit-scrollbar-thumb:hover {
                    background: #2a2a2a;
                }
            `}} />
        </div>
    );
};
