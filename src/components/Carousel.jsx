// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

// import required modules
import { Autoplay, Navigation, Pagination, Mousewheel, Zoom } from "swiper/modules";

import { useState, useRef } from "react";

const ProjectsSlider = ({ images }) => {
    const [isPlaying, setIsPlaying] = useState(true);
    const swiperRef = useRef(null);
    const [buttonColor, setButtonColor] = useState('white'); // default color

    const calculateButtonColor = (img) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size to image size
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Draw the image
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

        // Coordinates of the button in relation to the image
        // You need to figure these out based on your layout.
        // For example, if your button is always at the bottom-right:
        // Let's assume a small 20x20 px area behind the button
        const buttonX = img.naturalWidth - 40; // Adjust as needed
        const buttonY = img.naturalHeight - 40; // Adjust as needed
        const buttonWidth = 20;
        const buttonHeight = 20;

        // Get image data
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

        // Decide color based on average brightness
        const newColor = avgBrightness < 128 ? 'black' : 'white';
        setButtonColor(newColor);
    };


    const toggleAutoplay = () => {
        if (swiperRef.current && swiperRef.current.autoplay) {
            if (isPlaying) {
                swiperRef.current.autoplay.stop();
            } else {
                swiperRef.current.autoplay.start();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSlideChange = () => {
        if (!swiperRef.current) return;
        const activeIndex = swiperRef.current.activeIndex;
        const slides = document.querySelectorAll('.swiper-slide');
        const activeSlide = slides[activeIndex];
        const img = activeSlide.querySelector('img');
        if (img) {
            calculateButtonColor(img);
        }
    };

    return (
        <div className="relative">
            <Swiper
                onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                }}
                onSlideChange={handleSlideChange}
                slidesPerView={1}
                spaceBetween={12}
                speed={1000}
                loop={true}
                pagination={{
                    clickable: true
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
                modules={[Autoplay, Pagination, Navigation, Mousewheel, Zoom]}
                className="rounded-[20px]"
                style={{
                    "--swiper-pagination-color": "rgba(88, 86, 214, 1)",
                }}
                zoom={true}
            >
                {
                    images.map((image) => (
                        <SwiperSlide key={image.alt}>
                            <div className="swiper-zoom-container">
                                <img 
                                    src={image.path} 
                                    alt={image.alt} 
                                    className="rounded-[20px]" 
                                    crossOrigin="anonymous" 
                                />
                            </div>
                        </SwiperSlide>
                    ))
                }
            </Swiper>

            {images.length > 1 && (
                <button
                    onClick={toggleAutoplay}
                className={`
                    absolute bottom-2 right-2 z-10 p-1 rounded-full transition-colors backdrop-blur-sm
                    ${buttonColor === 'white' ? 'bg-black/30 text-white' : 'bg-white/50 text-black'}
                `}
            >
                {isPlaying ? (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24" height="24" fill="currentColor"
                        viewBox="0 0 16 16"
                    >
                        <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5
                            1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5
                            1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
                    </svg>
                ) : (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24" height="24" fill="currentColor"
                        viewBox="0 0 16 16"
                    >
                        <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308
                            c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802
                            0 0 1 0 1.393z"/>
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
};

export default ProjectsSlider;