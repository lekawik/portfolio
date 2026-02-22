import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Autoplay, Pagination, Mousewheel, Zoom } from "swiper/modules";

import { useRef, useState } from "react";

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".ogg", ".m4v"];

const getMediaType = (media) => {
    if (media?.type === "image" || media?.type === "video") {
        return media.type;
    }

    const path = media?.path?.split("?")[0]?.toLowerCase() ?? "";
    return VIDEO_EXTENSIONS.some((extension) => path.endsWith(extension))
        ? "video"
        : "image";
};

const getVideoMimeType = (path) => {
    const normalizedPath = path?.split("?")[0]?.toLowerCase() ?? "";

    if (normalizedPath.endsWith(".mov")) return "video/quicktime";
    if (normalizedPath.endsWith(".webm")) return "video/webm";
    if (normalizedPath.endsWith(".ogg")) return "video/ogg";
    if (normalizedPath.endsWith(".m4v")) return "video/x-m4v";
    return "video/mp4";
};

/**
 * @param {{
 *   images?: Array<{
 *     path: string;
 *     alt: string;
 *     type?: "image" | "video";
 *     caption?: string;
 *     poster?: string;
 *   }>;
 * }} props
 */
const ProjectsSlider = ({ images = [] }) => {
    const [isPlaying, setIsPlaying] = useState(true);
    const [buttonColor, setButtonColor] = useState("white");
    const [activeIndex, setActiveIndex] = useState(0);
    const [frameAspectRatio, setFrameAspectRatio] = useState(16 / 9);
    const swiperRef = useRef(null);
    const mediaRatioMapRef = useRef({});

    const calculateButtonColor = (img) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

        const buttonX = img.naturalWidth - 40;
        const buttonY = img.naturalHeight - 40;
        const buttonWidth = 20;
        const buttonHeight = 20;

        const imageData = ctx.getImageData(buttonX, buttonY, buttonWidth, buttonHeight);
        const data = imageData.data;

        let totalBrightness = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            totalBrightness += brightness;
            count++;
        }

        const avgBrightness = totalBrightness / count;
        setButtonColor(avgBrightness < 128 ? "black" : "white");
    };

    const pauseVideos = (swiper, { exceptSlide = null, resetCurrentTime = false } = {}) => {
        if (!swiper?.el) return;

        swiper.el.querySelectorAll("video").forEach((video) => {
            if (exceptSlide && exceptSlide.contains(video)) return;
            video.pause();
            if (resetCurrentTime) {
                video.currentTime = 0;
            }
        });
    };

    const playVideo = (video) => {
        if (!video) return;
        video.muted = true;
        const playPromise = video.play();
        if (playPromise?.catch) {
            playPromise.catch(() => {});
        }
    };

    const registerMediaRatio = (index, width, height) => {
        if (!width || !height) return;

        const ratio = width / height;
        if (!Number.isFinite(ratio) || ratio <= 0) return;

        mediaRatioMapRef.current[index] = ratio;
        const ratios = Object.values(mediaRatioMapRef.current);
        if (!ratios.length) return;

        const maxRatio = Math.max(...ratios);
        setFrameAspectRatio((previousRatio) => {
            const nextRatio = Math.max(previousRatio, maxRatio);
            return Math.abs(previousRatio - nextRatio) > 0.001 ? nextRatio : previousRatio;
        });
    };

    const syncActiveSlideState = () => {
        const swiper = swiperRef.current;
        if (!swiper || !swiper.el || !swiper.slides) return;

        setActiveIndex(swiper.realIndex ?? 0);

        const activeSlide = swiper.slides[swiper.activeIndex];
        if (!activeSlide) return;

        const activeImage = activeSlide.querySelector("img");
        if (activeImage) {
            calculateButtonColor(activeImage);
        }

        pauseVideos(swiper, { exceptSlide: activeSlide, resetCurrentTime: true });

        const activeVideo = activeSlide.querySelector("video");
        if (activeVideo) {
            if (!isPlaying) {
                activeVideo.pause();
                return;
            }

            swiper.autoplay?.stop();
            playVideo(activeVideo);
            return;
        }

        if (isPlaying) {
            swiper.autoplay?.start();
        } else {
            swiper.autoplay?.stop();
        }
    };

    const toggleAutoplay = () => {
        const swiper = swiperRef.current;
        if (!swiper || !swiper.el || !swiper.autoplay || !swiper.slides) return;

        const nextIsPlaying = !isPlaying;
        setIsPlaying(nextIsPlaying);

        const activeSlide = swiper.slides[swiper.activeIndex];
        const activeVideo = activeSlide?.querySelector("video");

        if (!nextIsPlaying) {
            swiper.autoplay.stop();
            pauseVideos(swiper);
            return;
        }

        if (activeVideo) {
            playVideo(activeVideo);
            return;
        }

        swiper.autoplay.start();
    };

    const handleVideoEnded = () => {
        const swiper = swiperRef.current;
        if (!swiper || !isPlaying) return;
        swiper.slideNext();
    };

    const activeCaption = images[activeIndex]?.caption?.trim() ?? "";
    const hasActiveCaption = activeCaption.length > 0;

    return (
        <div className="relative">
            <div className="relative">
                <Swiper
                    onSwiper={(swiper) => {
                        swiperRef.current = swiper;
                        setActiveIndex(swiper.realIndex ?? 0);
                        setTimeout(syncActiveSlideState, 0);
                        requestAnimationFrame(() => {
                            requestAnimationFrame(syncActiveSlideState);
                        });
                    }}
                    onSlideChangeTransitionEnd={syncActiveSlideState}
                    slidesPerView={1}
                    spaceBetween={12}
                    speed={1000}
                    loop={true}
                    pagination={{
                        clickable: true,
                        el: ".project-slider-pagination"
                    }}
                    mousewheel={{
                        enabled: true,
                        forceToAxis: true,
                    }}
                    direction="horizontal"
                    autoplay={{
                        delay: 2000,
                        disableOnInteraction: false,
                    }}
                    modules={[Autoplay, Pagination, Mousewheel, Zoom]}
                    style={{
                        "--swiper-pagination-color": "rgba(88, 86, 214, 1)",
                    }}
                    zoom={true}
                >
                    {images.map((media, index) => {
                        const mediaType = getMediaType(media);

                        return (
                            <SwiperSlide key={`${media.path}-${index}`}>
                                <div
                                    className="overflow-hidden rounded-[20px] bg-black/5"
                                    style={{ aspectRatio: frameAspectRatio }}
                                >
                                    {mediaType === "video" ? (
                                        <video
                                            src={media.path}
                                            className="w-full h-full object-contain bg-black"
                                            playsInline
                                            preload="metadata"
                                            muted
                                            poster={media.poster}
                                            onEnded={handleVideoEnded}
                                            onLoadedMetadata={(event) => {
                                                const video = event.currentTarget;
                                                registerMediaRatio(index, video.videoWidth, video.videoHeight);
                                            }}
                                            onCanPlay={(event) => {
                                                const swiper = swiperRef.current;
                                                if (!swiper || !swiper.slides || !isPlaying) return;
                                                const currentSlide = swiper.slides[swiper.activeIndex];
                                                if (!currentSlide || !currentSlide.contains(event.currentTarget)) return;
                                                playVideo(event.currentTarget);
                                            }}
                                        >
                                            <source src={media.path} type={getVideoMimeType(media.path)} />
                                            Your browser does not support the video tag.
                                        </video>
                                    ) : (
                                        <div className="swiper-zoom-container h-full w-full">
                                            <img
                                                src={media.path}
                                                alt={media.alt}
                                                className="w-full h-full object-contain"
                                                crossOrigin="anonymous"
                                                onLoad={(event) => {
                                                    registerMediaRatio(
                                                        index,
                                                        event.currentTarget.naturalWidth,
                                                        event.currentTarget.naturalHeight
                                                    );
                                                    if (index === 0) {
                                                        calculateButtonColor(event.currentTarget);
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>

                {images.length > 1 && (
                    <button
                        onClick={toggleAutoplay}
                        className={`
                            absolute bottom-2 right-2 z-10 p-1 rounded-full transition-colors backdrop-blur-sm
                            ${buttonColor === "white" ? "bg-black/30 text-white" : "bg-white/50 text-black"}
                        `}
                    >
                        {isPlaying ? (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                fill="currentColor"
                                viewBox="0 0 16 16"
                            >
                                <path
                                    d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5
                                    1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5
                                    1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"
                                />
                            </svg>
                        ) : (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                fill="currentColor"
                                viewBox="0 0 16 16"
                            >
                                <path
                                    d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308
                                    c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802
                                    0 0 1 0 1.393z"
                                />
                            </svg>
                        )}
                    </button>
                )}
            </div>

            <p
                className={`
                    mt-2 px-1 text-sm text-secondary-text dark:text-secondary-text-dark
                    ${hasActiveCaption ? "" : "invisible"}
                `}
                aria-hidden={!hasActiveCaption}
            >
                {hasActiveCaption ? activeCaption : "\u00A0"}
            </p>

            <div
                className="project-slider-pagination mt-2 flex justify-center"
                style={{ position: "static" }}
            />
        </div>
    );
};

export default ProjectsSlider;
