import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Float,
  ContactShadows,
  Sparkles,
} from "@react-three/drei";

// ============================================================================
// CẤU HÌNH DỮ LIỆU & TÙY CHỈNH NHANH (BẠN CHỈ CẦN SỬA NỘI DUNG Ở ĐÂY)
// ============================================================================
/*
  =============================================================================
  📌 HƯỚNG DẪN THAY 2 BẢN NHẠC NỀN (.MP3) VÀ 14 ẢNH TỪ MÁY TÍNH CÁ NHÂN:
  =============================================================================
  1. Trong thư mục gốc dự án của bạn (ngang hàng với thư mục `src`), có sẵn thư mục `public`.
  2. Hãy copy 2 file nhạc (.mp3) và 14 bức ảnh vào thư mục `public`:
     - Nhạc trang Thử thách: bỏ vào `public/music/nhac-thu-thach.mp3`
     - Nhạc trang Không gian 3D: bỏ vào `public/music/nhac-sinh-nhat-3d.mp3`
     - 14 bức ảnh kỷ niệm: bỏ vào `public/photos/anh-1.jpg` ... `anh-14.jpg`
*/

const CONFIG = {
  // 0. CẤU HÌNH 2 BẢN NHẠC NỀN RIÊNG BIỆT (Trang Đăng nhập tự động tắt nhạc)
  audioConfig: {
    // <--- [CHỖ THAY BẢN NHẠC 1 - PHÁT KHI VÀO TRANG THỬ THÁCH GIẢI MÃ]:
    gamesMp3Url: "/music/nhac-thu-thach.mp3",

    // <--- [CHỖ THAY BẢN NHẠC 2 - PHÁT KHI VÀO KHÔNG GIAN 3D & PHOTOBOOTH]:
    celebrationMp3Url: "/music/piano.mp3",

    defaultVolume: 0.5,
  },

  // 1. CẤU HÌNH GỬI DỮ LIỆU & GỬI 8 ẢNH PHOTOBOOTH VỀ GOOGLE DRIVE
  submissionConfig: {
    mode: "APPS_SCRIPT",
    appsScriptUrl:
      "https://script.google.com/macros/s/AKfycbwV1M2KQ1Gk1yltSkGcnXBf6uLSt-7_0IHyS-b6chucGBLo3JXOhvPzFo-TnAw-tq-fKg/exec",
    googleFormActionUrl:
      "https://docs.google.com/forms/d/e/1FAIpQLSf_YOUR_FORM_ID_HERE/formResponse",
    googleFormEntries: {
      typeField: "entry.111111111",
      contentField: "entry.222222222",
      timestampField: "entry.333333333",
    },
    webhookUrl: "https://webhook.site/placeholder-birthday-url-change-me",
  },

  // 2. Thông tin đăng nhập
  auth: {
    username: "1909",
    password: "1510",
    usernameHint: "Ngày sinh của cô",
    passwordHint: "Ngày sinh của tôi",
  },

  // 3. Màn 1: Trắc nghiệm (Chọn sai hiện đỏ + xanh 2.2 giây rồi tự reset để chọn lại)
  game1: {
    digit: "1",
    resetDelayMs: 2200,
    question:
      "Trong những khoảnh khắc đời thường dưới đây, điều gì làm nên một ngày sinh nhật thật sự đáng nhớ và trọn vẹn nhất?",
    options: [
      { id: "A", text: "Một bữa tiệc thật ồn ào ở nơi đông đúc" },
      { id: "B", text: "Chỉ cần đếm thật nhiều quà mà không cần lời chúc" },
      { id: "C", text: "Ngủ một mạch từ sáng đến tối không gặp ai" },
      {
        id: "D",
        text: "Sự hiện diện ấm áp, chân thành và những kỷ niệm dịu dàng bên người thương quý",
      },
    ],
    correctAnswer: "D",
  },

  // 4. Màn 2: Thật hay Thách (Mở khóa số 5 - Flappy Bird khóa ở 49 điểm)
  game2: {
    digit: "5",
    flappyTargetScore: 50,
    flappyPointsPerPipe: 1,
    flappyTrapScore: 49,
    truthQuestions: [
      "1. Ấn tượng đầu tiên của bạn về mình là gì (hãy nói thật lòng nhé)?",
      "2. Kỷ niệm nào giữa chúng mình khiến bạn mỉm cười mỗi khi bất chợt nhớ lại?",
      "3. Điều nhỏ bé gì ở hiện tại đang làm bạn cảm thấy bình yên và hạnh phúc nhất?",
      "4. Nếu có một tấm vé đi bất cứ đâu vào ngày mai, bạn muốn đi đâu cùng ai?",
      "5. Một thói quen đáng yêu của bạn mà ít người nhận ra là gì?",
      "6. Trong tuổi mới này, mục tiêu lớn nhất mà bạn muốn chinh phục là gì?",
      "7. Hãy viết một lời nhắn nhủ thật lòng gửi cho chính bạn của 1 năm sau:",
    ],
  },

  // 5. Màn 3: Ai Là Triệu Phú Sinh Tồn (Sai hiện Đỏ + Xanh 2.2 giây rồi TỰ ĐỘNG RESET VỀ CÂU 1)
  game3: {
    digit: "1",
    targetStreak: 10,
    resetDelayMs: 2200,
    questionsPool: [
      {
        q: "Loài hoa nào thường biểu trưng cho sự thuần khiết, dịu dàng và thanh tao?",
        options: [
          "Hoa Linh Lan",
          "Hoa Xương Rồng",
          "Hoa Dâm Bụt",
          "Hoa Hướng Dương",
        ],
        correct: 0,
      },
      {
        q: "Đâu là tên một nốt nhạc cơ bản trong âm nhạc?",
        options: ["Nốt Son", "Nốt Mây", "Nốt Gió", "Nốt Nắng"],
        correct: 0,
      },
      {
        q: "Trong một năm dương lịch, tháng nào có ít ngày nhất?",
        options: ["Tháng 4", "Tháng 2", "Tháng 6", "Tháng 9"],
        correct: 1,
      },
      {
        q: "Sắc xanh dương Pastel của bầu trời và chiếc áo Scrubs bác sĩ mang lại cảm giác gì?",
        options: [
          "Sự bình yên, tin cậy và niềm hy vọng dịu mát",
          "Sự nóng bức của sa mạc",
          "Sự ồn ào vội vã",
          "Cảm giác cay nồng",
        ],
        correct: 0,
      },
      {
        q: "Khi thổi nến sinh nhật, người ta thường làm gì ngay trước đó?",
        options: [
          "Nhắm mắt và ước một điều tốt đẹp",
          "Đi rửa mặt",
          "Đếm số hạt đường trên bánh",
          "Tắt màn hình điện thoại",
        ],
        correct: 0,
      },
      {
        q: "Đâu là thức uống thường xuất hiện trong những buổi chiều thư giãn nhẹ nhàng?",
        options: [
          "Trà hoa cúc mật ong",
          "Nước mắm nguyên chất",
          "Giấm táo đậm đặc",
          "Dầu ăn",
        ],
        correct: 0,
      },
      {
        q: "Hành tinh nào được mệnh danh là 'Sao Hôm' và 'Sao Mai' trên bầu trời?",
        options: ["Sao Kim (Venus)", "Sao Hỏa", "Sao Thủy", "Sao Thổ"],
        correct: 0,
      },
      {
        q: "Một năm nhuận có tổng cộng bao nhiêu ngày?",
        options: ["365 ngày", "366 ngày", "364 ngày", "360 ngày"],
        correct: 1,
      },
      {
        q: "Dụng cụ quen thuộc nào luôn gắn liền với hình ảnh người Bác sĩ tận tâm?",
        options: [
          "Ống nghe y khoa (Stethoscope)",
          "Chiếc xẻng làm vườn",
          "Cây vợt cầu lông",
          "Chiếc la bàn",
        ],
        correct: 0,
      },
      {
        q: "Cầu vồng thường xuất hiện trên bầu trời vào thời điểm nào?",
        options: [
          "Sau cơn mưa khi có ánh nắng mặt trời",
          "Lúc nửa đêm không trăng",
          "Khi tuyết rơi dày",
          "Trong phòng kín",
        ],
        correct: 0,
      },
      {
        q: "Loại nhạc cụ nào có các phím đen và trắng xếp xen kẽ nhau?",
        options: ["Đàn Piano", "Đàn Bầu", "Sáo Trúc", "Trống Cơ"],
        correct: 0,
      },
      {
        q: "Trong bốn mùa Xuân - Hạ - Thu - Đông, mùa nào bầu trời thường trong xanh cao vời vợi?",
        options: ["Mùa Thu", "Mùa Mưa", "Mùa Bão", "Mùa Tuyết"],
        correct: 0,
      },
      {
        q: "Thành phần chính tạo nên vị ngọt dịu tự nhiên của mật ong là gì?",
        options: ["Mật hoa tự nhiên", "Muối biển", "Bột mì", "Hạt tiêu"],
        correct: 0,
      },
      {
        q: "Đâu là một cách thể hiện sự quan tâm tinh tế dành cho người thương quý?",
        options: [
          "Lắng nghe chân thành và nhớ những điều nhỏ nhặt",
          "Luôn ngắt lời khi họ nói",
          "Quên hết mọi lời hứa",
          "Chỉ nhắn tin khi cần nhờ vả",
        ],
        correct: 0,
      },
      {
        q: "Ánh sáng mặt trời vào lúc sáng sớm thường được gọi là gì?",
        options: [
          "Bình minh / Nắng mai",
          "Hoàng hôn",
          "Chạng vạng",
          "Đêm khuya",
        ],
        correct: 0,
      },
      {
        q: "Hương thơm nào sau đây thường giúp tinh thần thư thái, dễ chịu?",
        options: [
          "Hương gió biển & gỗ đàn hương",
          "Mùi khói xe",
          "Mùi xăng",
          "Mùi sơn tường",
        ],
        correct: 0,
      },
      {
        q: "Một tuần lễ có tất cả bao nhiêu giờ đồng hồ?",
        options: ["168 giờ", "120 giờ", "144 giờ", "200 giờ"],
        correct: 0,
      },
      {
        q: "Kim loại nào quý hiếm thường được dùng để chế tác trang sức thanh lịch?",
        options: [
          "Bạch kim (Platinum) & Vàng",
          "Than đá",
          "Nhựa dẻo",
          "Gỗ thông",
        ],
        correct: 0,
      },
      {
        q: "Trên chiếc bánh kem truyền thống, những ngọn nến tượng trưng cho điều gì?",
        options: [
          "Ánh sáng hy vọng và cột mốc tuổi mới rạng rỡ",
          "Nhiệt độ trong phòng",
          "Trọng lượng chiếc bánh",
          "Thời gian nướng bánh",
        ],
        correct: 0,
      },
      {
        q: "Điều gì làm cho một món quà trở nên vô giá?",
        options: [
          "Tấm lòng và tâm huyết của người chuẩn bị",
          "Kích thước thật cồng kềnh",
          "Bao bì càng dày càng tốt",
          "Mua vội trong 1 phút",
        ],
        correct: 0,
      },
    ],
  },

  // 6. Màn 4: Giải Toán (Mở khóa số 0)
  game4: {
    digit: "0",
    mathQuestion:
      "Bài toán nhỏ: Lấy (Số tháng trong 1 năm × 2) cộng với (Số ngày trong 1 tuần), rồi trừ đi 6. Kết quả bằng bao nhiêu?",
    correctAnswer: "25",
    maxWrongAttempts: 5,
    teasePopupTitle: "Ơ kìa, tính nhẩm hơi lag nhẹ rồi nha! 🤭",
    teasePopupMessage:
      "Sai tới 5 lần luôn rồi đó! Thôi không sao, hôm nay là ngày đặc biệt nên hệ thống xin phép 'cứu trợ' nhẹ nhàng. Đáp án chính xác là 25 nhé, tặng luôn chữ số cuối cùng nè!",
  },

  // 7. Trang Chúc mừng 3D & Photobooth (14 BỨC ẢNH KỶ NIỆM BAY NGẪU NHIÊN LUÂN PHIÊN)
  celebration: {
    // <--- [CHỖ THAY 14 ẢNH KỶ NIỆM TỪ MÁY CÁ NHÂN]:
    // Tạo thư mục `public/photos` trong dự án, bỏ 14 bức ảnh vào đó (ví dụ: `anh-1.jpg` -> `anh-14.jpg`)
    // Sau đó đổi các đường dẫn `url` bên dưới thành: `url: "/photos/anh-1.jpg"`,... `url: "/photos/anh-14.jpg"`
    balloonPhotos: [
      {
        url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-1.jpg"
        caption: "Khởi đầu dịu dàng",
      },
      {
        url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-2.jpg"
        caption: "Nụ cười tỏa nắng",
      },
      {
        url: "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-3.jpg"
        caption: "Tuổi mới bình yên",
      },
      {
        url: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-4.jpg"
        caption: "Khoảnh khắc đáng nhớ",
      },
      {
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-5.jpg"
        caption: "Biển trời mênh mông",
      },
      {
        url: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-6.jpg"
        caption: "Rạng rỡ như hoa",
      },
      {
        url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-7.jpg"
        caption: "Hạnh phúc ngập tràn",
      },
      {
        url: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-8.jpg"
        caption: "Nắng ấm ban mai",
      },
      {
        url: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-9.jpg"
        caption: "Bữa tiệc ngọt ngào",
      },
      {
        url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-10.jpg"
        caption: "Giai điệu thanh xuân",
      },
      {
        url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-11.jpg"
        caption: "Dịu dàng trong trẻo",
      },
      {
        url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-12.jpg"
        caption: "Ước mơ bay cao",
      },
      {
        url: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-13.jpg"
        caption: "Ánh nhìn lấp lánh",
      },
      {
        url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=400&q=80", // <-- Đổi thành "/photos/anh-14.jpg"
        caption: "Mãi luôn rạng ngời",
      },
    ],
    letterTitle: "Gửi Người Đặc Biệt Trong Ngày Sinh Nhật",
    letterContent: `Chúc mừng sinh nhật bạn nhé!

Vậy là bạn đã kiên nhẫn vượt qua tất cả những thử thách nhỏ nhắn (và có chút tinh nghịch) để mở ra trang sách nhỏ này. Khoảnh khắc ngọn nến vừa được thổi tắt cũng là lúc một hành trình tuổi mới chính thức bắt đầu — nhẹ nhàng, trong trẻo như sắc xanh của bầu trời và đại dương.

Cảm ơn bạn vì đã luôn mang đến một nguồn năng lượng thật ấm áp, dịu dàng và sự tận tâm chữa lành cho thế giới xung quanh. Giữa nhịp sống và những ca trực đôi khi vội vã, mong rằng ở tuổi mới này, bạn sẽ luôn giữ được ánh mắt trong veo, nụ cười tự nhiên và một trái tim bình yên trước mọi thử thách.

Mọi điều ước bạn vừa gửi gắm vào ngọn nến lúc nãy, mình tin rằng bằng sự nỗ lực và vẻ đẹp tâm hồn của bạn, tất cả đều sẽ lần lượt nở hoa theo cách trọn vẹn nhất. Chúc bạn mỗi sớm mai thức dậy đều tìm thấy niềm vui trong những điều giản dị, có thật nhiều sức khỏe, được yêu thương thật nhiều và luôn tự hào về chính mình.

Hãy tận hưởng ngày hôm nay theo cách mà bạn thấy hạnh phúc nhất nhé. Đừng quên ghé góc Photobooth bên phải màn hình để lưu lại những bức ảnh kỷ niệm thật xinh trong ngày hôm nay nha!`,
    letterSign: "Thân thương, Người chuẩn bị món quà nhỏ này dành tặng bạn",
  },
};

// ============================================================================
// HÀM TIỆN ÍCH XÁO TRỘN CÂU HỎI MÀN 3 & GỬI DỮ LIỆU ĐẾN GOOGLE DRIVE
// ============================================================================
function createShuffledGame3Questions() {
  const pool = [...CONFIG.game3.questionsPool];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, CONFIG.game3.targetStreak);
}

async function sendToGoogleOrWebhook(payload: {
  type: string;
  timestamp: string;
  data?: Array<{ question: string; answer: string }>;
  wish?: string;
  photos?: Array<{ id: number; dataUrl: string; filterName: string }>;
}) {
  const cfg = CONFIG.submissionConfig;
  let formattedText = "";

  if (payload.type === "TRUTH_GAME_ANSWERS" && payload.data) {
    formattedText = payload.data
      .map((item) => `• ${item.question}\n  -> Trả lời: ${item.answer}`)
      .join("\n\n");
  } else if (payload.type === "BIRTHDAY_CANDLE_WISH") {
    formattedText = `Điều ước tuổi mới: "${payload.wish || ""}"`;
  } else if (payload.type === "PHOTOBOOTH_8_PHOTOS") {
    formattedText = `Bộ 8 ảnh Photobooth sinh nhật (${payload.photos?.length || 0} ảnh)`;
  }

  try {
    if (
      cfg.mode === "APPS_SCRIPT" &&
      cfg.appsScriptUrl &&
      !cfg.appsScriptUrl.includes("YOUR_APPS_SCRIPT_DEPLOYMENT_ID")
    ) {
      await fetch(cfg.appsScriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          ...payload,
          formattedText,
        }),
      });
      return true;
    }

    if (
      cfg.mode === "GOOGLE_FORM" &&
      cfg.googleFormActionUrl &&
      !cfg.googleFormActionUrl.includes("YOUR_FORM_ID_HERE") &&
      payload.type !== "PHOTOBOOTH_8_PHOTOS"
    ) {
      const formData = new FormData();
      formData.append(cfg.googleFormEntries.typeField, payload.type);
      formData.append(cfg.googleFormEntries.contentField, formattedText);
      if (cfg.googleFormEntries.timestampField) {
        formData.append(
          cfg.googleFormEntries.timestampField,
          payload.timestamp,
        );
      }
      await fetch(cfg.googleFormActionUrl, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      });
      return true;
    }

    if (cfg.webhookUrl) {
      await fetch(cfg.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          formattedText,
        }),
      }).catch(() => {
        // Ignore network/CORS errors on placeholder webhook
      });
    }
  } catch {
    // Ignore CORS errors so user experience stays smooth
  }
  return true;
}

// ============================================================================
// BỘ PHÁT NHẠC NỀN 2 BẢN RIÊNG BIỆT:
// - LOGIN: Tắt hoàn toàn (Không phát nhạc)
// - GAMES: Tự động bật `gamesMp3Url`
// - CELEBRATION & PHOTOBOOTH: Tự động bật `celebrationMp3Url`
// ============================================================================
function BackgroundMusicPlayer({
  screen,
}: {
  screen: "LOGIN" | "GAMES" | "CELEBRATION" | "PHOTOBOOTH";
}) {
  const [isMutedByUser, setIsMutedByUser] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackUrlRef = useRef<string>("");
  const isMutedRef = useRef(false);

  // Xác định bản nhạc cần phát dựa trên màn hình hiện tại
  const targetTrackUrl = useMemo(() => {
    if (screen === "LOGIN") return "";
    if (screen === "GAMES") return CONFIG.audioConfig.gamesMp3Url;
    return CONFIG.audioConfig.celebrationMp3Url;
  }, [screen]);

  const syncAndPlayTrack = useCallback((trackUrl: string) => {
    if (!trackUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      currentTrackUrlRef.current = "";
      return;
    }

    // Nếu chuyển sang màn hình có bản nhạc khác -> Đổi source nhạc và phát từ đầu
    if (!audioRef.current || currentTrackUrlRef.current !== trackUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const nextAudio = new Audio(trackUrl);
      nextAudio.loop = true;
      nextAudio.volume = CONFIG.audioConfig.defaultVolume ?? 0.5;
      audioRef.current = nextAudio;
      currentTrackUrlRef.current = trackUrl;
    }

    if (!isMutedRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {
        // Nếu trình duyệt di động yêu cầu chạm thêm 1 lần để unlock audio
      });
    }
  }, []);

  useEffect(() => {
    syncAndPlayTrack(targetTrackUrl);
  }, [targetTrackUrl, syncAndPlayTrack]);

  useEffect(() => {
    const unlockOnGesture = () => {
      if (
        !isMutedRef.current &&
        currentTrackUrlRef.current &&
        audioRef.current?.paused
      ) {
        audioRef.current.play().catch(() => {
          // Ignore play error
        });
      }
    };

    window.addEventListener("pointerdown", unlockOnGesture);
    window.addEventListener("keydown", unlockOnGesture);
    window.addEventListener("touchstart", unlockOnGesture, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlockOnGesture);
      window.removeEventListener("keydown", unlockOnGesture);
      window.removeEventListener("touchstart", unlockOnGesture);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Ở Trang Đăng nhập không cần nhạc nền nên ẩn luôn nút nhạc
  if (screen === "LOGIN" || !targetTrackUrl) return null;

  const handleToggleButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isMutedByUser) {
      isMutedRef.current = true;
      setIsMutedByUser(true);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      isMutedRef.current = false;
      setIsMutedByUser(false);
      syncAndPlayTrack(targetTrackUrl);
    }
  };

  const activeSound = !isMutedByUser;

  return (
    <button
      type="button"
      onClick={handleToggleButton}
      title={activeSound ? "Nhấn để tắt âm thanh" : "Nhấn để bật lại âm thanh"}
      className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-[#FAF8F2]/95 hover:bg-white border border-[#C5D8E6] shadow-[0_8px_25px_rgba(44,68,90,0.14)] text-[#283E52] text-xs font-medium transition-all cursor-pointer group"
    >
      <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#E6F0F7] text-[#4A7896]">
        {activeSound ? "🎵" : "🔇"}
        {activeSound && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#5B89A6] animate-ping" />
        )}
      </span>
      <span className="hidden sm:inline font-medium">
        {activeSound
          ? screen === "GAMES"
            ? "Nhạc Thử Thách: Bật"
            : "Nhạc Sinh Nhật 3D: Bật"
          : "Bật nhạc nền"}
      </span>
      {activeSound && (
        <span className="flex items-end gap-0.5 h-3 ml-0.5">
          <span className="w-0.5 bg-[#5B89A6] rounded-full animate-musicBar1" />
          <span className="w-0.5 bg-[#5B89A6] rounded-full animate-musicBar2" />
          <span className="w-0.5 bg-[#5B89A6] rounded-full animate-musicBar3" />
        </span>
      )}
    </button>
  );
}

// ============================================================================
// COMPONENT TRANG TRÍ: CÀNH LÁ, DÂY CỜ BUNTING & BỌT BIỂN / ÁNH SAO LẤP LÁNH
// ============================================================================
function AmbientDecorations({ showBunting = true }: { showBunting?: boolean }) {
  const particles = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: `${(i * 19 + 7) % 94}%`,
      top: `${(i * 29 + 11) % 88}%`,
      size: 4 + (i % 3) * 3,
      delay: `${(i * 0.7) % 5}s`,
      duration: `${6 + (i % 5) * 2}s`,
      type: i % 4 === 0 ? "shell" : i % 3 === 0 ? "sparkle" : "dot",
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <svg
        className="absolute -top-6 -left-6 w-40 h-40 sm:w-56 sm:h-56 md:w-72 md:h-72 text-[#5B89A6]/15 transform -rotate-12"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          d="M10,10 Q70,70 160,150"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse
          cx="45"
          cy="30"
          rx="18"
          ry="10"
          transform="rotate(-25 45 30)"
          fill="currentColor"
        />
        <ellipse
          cx="30"
          cy="55"
          rx="16"
          ry="9"
          transform="rotate(35 30 55)"
          fill="currentColor"
        />
        <ellipse
          cx="78"
          cy="58"
          rx="22"
          ry="11"
          transform="rotate(-30 78 58)"
          fill="currentColor"
        />
        <ellipse
          cx="62"
          cy="88"
          rx="20"
          ry="10"
          transform="rotate(30 62 88)"
          fill="currentColor"
        />
        <ellipse
          cx="115"
          cy="90"
          rx="22"
          ry="11"
          transform="rotate(-35 115 90)"
          fill="currentColor"
        />
        <ellipse
          cx="95"
          cy="122"
          rx="19"
          ry="9"
          transform="rotate(25 95 122)"
          fill="currentColor"
        />
        <ellipse
          cx="148"
          cy="126"
          rx="17"
          ry="8"
          transform="rotate(-30 148 126)"
          fill="currentColor"
        />
      </svg>

      <svg
        className="absolute -bottom-8 -right-8 w-44 h-44 sm:w-64 sm:h-64 md:w-80 md:h-80 text-[#5B89A6]/15 transform rotate-165"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          d="M190,190 Q130,130 40,50"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse
          cx="155"
          cy="170"
          rx="18"
          ry="10"
          transform="rotate(-25 155 170)"
          fill="currentColor"
        />
        <ellipse
          cx="170"
          cy="145"
          rx="16"
          ry="9"
          transform="rotate(35 170 145)"
          fill="currentColor"
        />
        <ellipse
          cx="122"
          cy="142"
          rx="22"
          ry="11"
          transform="rotate(-30 122 142)"
          fill="currentColor"
        />
        <ellipse
          cx="138"
          cy="112"
          rx="20"
          ry="10"
          transform="rotate(30 138 112)"
          fill="currentColor"
        />
        <ellipse
          cx="85"
          cy="110"
          rx="22"
          ry="11"
          transform="rotate(-35 85 110)"
          fill="currentColor"
        />
        <ellipse
          cx="105"
          cy="78"
          rx="19"
          ry="9"
          transform="rotate(25 105 78)"
          fill="currentColor"
        />
      </svg>

      {showBunting && (
        <div className="absolute top-0 left-0 right-0 flex justify-between overflow-hidden opacity-65">
          <svg
            className="w-full h-12 sm:h-16 md:h-20"
            viewBox="0 0 1200 90"
            preserveAspectRatio="none"
          >
            <path
              d="M0,5 Q300,65 600,15 Q900,65 1200,5"
              stroke="#B4CCE0"
              strokeWidth="2"
              fill="none"
            />
            {[
              { x: 60, y: 18, c: "#CFE2EE" },
              { x: 140, y: 30, c: "#EFE7D6" },
              { x: 220, y: 38, c: "#9EC2DA" },
              { x: 300, y: 40, c: "#E8DFCA" },
              { x: 380, y: 36, c: "#CFE2EE" },
              { x: 460, y: 28, c: "#EFE7D6" },
              { x: 540, y: 19, c: "#9EC2DA" },
              { x: 660, y: 22, c: "#CFE2EE" },
              { x: 740, y: 32, c: "#E8DFCA" },
              { x: 820, y: 39, c: "#9EC2DA" },
              { x: 900, y: 40, c: "#EFE7D6" },
              { x: 980, y: 35, c: "#CFE2EE" },
              { x: 1060, y: 26, c: "#E8DFCA" },
              { x: 1140, y: 15, c: "#9EC2DA" },
            ].map((flag, idx) => (
              <polygon
                key={idx}
                points={`${flag.x - 18},${flag.y} ${flag.x + 18},${flag.y} ${flag.x},${flag.y + 34}`}
                fill={flag.c}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            ))}
          </svg>
        </div>
      )}

      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
          className="absolute animate-floatSparkle"
        >
          {p.type === "shell" ? (
            <span className="text-[#5B89A6]/35 text-xs select-none">🫧</span>
          ) : p.type === "sparkle" ? (
            <span className="text-[#C8B282]/55 text-xs select-none">✦</span>
          ) : (
            <div
              style={{ width: p.size, height: p.size }}
              className="rounded-full bg-[#7BA7C4]/35 blur-[0.5px]"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENT 1: TRANG ĐĂNG NHẬP (TỐI ƯU RESPONSIVE MOBILE & DESKTOP, KHÔNG NHẠC)
// ============================================================================
function Login({
  onLoginSuccess,
  onGoToGames,
  unlockedDigits,
}: {
  onLoginSuccess: () => void;
  onGoToGames: () => void;
  unlockedDigits: Array<string | null>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const hasAllDigits = unlockedDigits.every((d) => d !== null);
  const suggestedPass = hasAllDigits ? unlockedDigits.join("") : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      username.trim() === CONFIG.auth.username &&
      password.trim() === CONFIG.auth.password
    ) {
      setErrorMsg("");
      onLoginSuccess();
    } else {
      setErrorMsg(
        "Thông tin chưa chính xác rồi. Hãy thử lại hoặc ghé phần Giải mã để lấy mật khẩu nhé!",
      );
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden">
      <div className="w-72 h-72 sm:w-96 sm:h-96 bg-[#D2E4F0]/60 rounded-full blur-3xl absolute -top-20 -left-20 pointer-events-none" />
      <div className="w-72 h-72 sm:w-96 sm:h-96 bg-[#EFE8D8]/80 rounded-full blur-3xl absolute -bottom-20 -right-20 pointer-events-none" />

      <div className="w-full max-w-md bg-[#FAF8F2]/90 backdrop-blur-md border border-[#D8E5EE] rounded-[2rem] sm:rounded-[2.25rem] shadow-[0_24px_60px_rgba(52,82,108,0.1)] p-6 sm:p-8 md:p-10 relative z-10 transition-all duration-500">
        <div className="absolute inset-2.5 sm:inset-3 border border-[#E5DEC9]/70 rounded-[1.5rem] sm:rounded-[1.75rem] pointer-events-none" />

        <div className="text-center mb-6 sm:mb-7 relative">
          <div className="relative inline-flex items-center justify-center mb-2.5 sm:mb-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#6B9BB8] to-[#487594] shadow-[0_6px_18px_rgba(72,117,148,0.35)] flex items-center justify-center border-2 border-[#E6DFC8]">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-dashed border-[#FAF8F2]/60 flex items-center justify-center">
                <span className="text-xl sm:text-2xl select-none">🌊</span>
              </div>
            </div>
            <span className="absolute -right-3 -top-1 text-[#C8A96E] text-sm animate-pulse">
              ✦
            </span>
            <span className="absolute -left-3 bottom-0 text-[#5B89A6] text-xs animate-pulse">
              ✦
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="h-[1px] w-6 sm:w-8 bg-[#C4D6E3]" />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-[#5C7F96] font-semibold">
              Thiệp Mời Đặc Biệt
            </span>
            <span className="h-[1px] w-6 sm:w-8 bg-[#C4D6E3]" />
          </div>

          <h1 className="font-serif-vn text-2xl sm:text-3xl font-semibold text-[#283E52] tracking-tight">
            Cánh Cửa Sinh Nhật
          </h1>
          <p className="text-xs sm:text-sm text-[#5E768A] mt-1.5 sm:mt-2 leading-relaxed px-2">
            Nhập mã kỷ niệm để bước vào không gian bình yên của bầu trời và đại
            dương
          </p>
        </div>

        {hasAllDigits && (
          <div className="mb-5 p-3 rounded-2xl bg-[#EAF2F8] border border-[#B5D0E3] text-center text-xs text-[#2C5270] flex flex-wrap items-center justify-center gap-2 shadow-sm">
            <span>✨ Bạn đã thu thập đủ mật khẩu:</span>
            <strong className="tracking-widest text-sm font-bold bg-white px-2.5 py-0.5 rounded-lg border border-[#B5D0E3]">
              {suggestedPass}
            </strong>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-5 relative z-10"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
              <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-[#546E82] font-semibold">
                Tên đăng nhập
              </label>
              <span className="text-[11px] sm:text-xs text-[#487594] bg-[#E8F1F7] px-2.5 py-0.5 rounded-full font-medium border border-[#C8DCEB]">
                💡 Gợi ý: {CONFIG.auth.usernameHint}
              </span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập 4 chữ số..."
              className="w-full px-4 py-3 rounded-xl bg-white/95 border border-[#D2E0EB] text-[#283E52] placeholder-[#95ACB8] focus:outline-none focus:border-[#5B89A6] focus:ring-2 focus:ring-[#5B89A6]/20 transition-all text-base sm:text-sm"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
              <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-[#546E82] font-semibold">
                Mật khẩu
              </label>
              <span className="text-[11px] sm:text-xs text-[#487594] bg-[#E8F1F7] px-2.5 py-0.5 rounded-full font-medium border border-[#C8DCEB]">
                💡 Gợi ý: {CONFIG.auth.passwordHint}
              </span>
            </div>
            <input
              type="password"
              inputMode="numeric"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu 4 chữ số..."
              className="w-full px-4 py-3 rounded-xl bg-white/95 border border-[#D2E0EB] text-[#283E52] placeholder-[#95ACB8] focus:outline-none focus:border-[#5B89A6] focus:ring-2 focus:ring-[#5B89A6]/20 transition-all text-base sm:text-sm"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#F2CACA] text-[#A64444] text-xs leading-relaxed text-center animate-fadeIn">
              {errorMsg}
            </div>
          )}

          <div className="pt-1.5 flex flex-col gap-2.5 sm:gap-3">
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl bg-[#5B89A6] hover:bg-[#487594] active:scale-[0.99] text-white font-medium text-sm shadow-[0_8px_20px_rgba(91,137,166,0.28)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Mở Cửa Không Gian 3D</span>
              <span>✨</span>
            </button>

            <button
              type="button"
              onClick={onGoToGames}
              className="w-full py-2.5 px-4 rounded-xl bg-[#F0ECE1]/80 hover:bg-[#E4EEF5] text-[#486880] hover:text-[#283E52] font-medium text-xs transition-all cursor-pointer border border-transparent hover:border-[#C2D6E5]"
            >
              Bạn quên mật khẩu? / Lấy gợi ý mật khẩu 🗝️
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MINI-GAME 2A: FLAPPY BIRD (HỖ TRỢ CHẠM CẢM ỨNG ĐIỆN THOẠI & PHÍM SPACE)
// ============================================================================
interface FlappyPipe {
  x: number;
  topHeight: number;
  baseTopHeight: number;
  gap: number;
  passed: boolean;
  isTrapPipe: boolean;
  pipeIndex: number;
  oscPhase: number;
  oscSpeed: number;
}

function FlappyBirdGame({
  targetScore = 50,
  pointsPerPipe = 1,
  onSwitchToTruth,
}: {
  targetScore?: number;
  pointsPerPipe?: number;
  onSwitchToTruth?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [deathsAt49, setDeathsAt49] = useState(0);
  const [lastDeathScore, setLastDeathScore] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "IDLE" | "READY" | "PLAYING" | "GAMEOVER"
  >("IDLE");

  const gameRef = useRef<{
    birdY: number;
    birdV: number;
    pipes: FlappyPipe[];
    frameCount: number;
    currentScore: number;
    bestScore: number;
    isRunning: boolean;
    isReadyHover: boolean;
    lastTime: number;
    spawnTimer: number;
    spawnedPipesCount: number;
  }>({
    birdY: 130,
    birdV: 0,
    pipes: [],
    frameCount: 0,
    currentScore: 0,
    bestScore: 0,
    isRunning: false,
    isReadyHover: false,
    lastTime: 0,
    spawnTimer: 0,
    spawnedPipesCount: 0,
  });

  const startGame = () => {
    gameRef.current = {
      ...gameRef.current,
      birdY: 130,
      birdV: 0,
      pipes: [],
      frameCount: 0,
      currentScore: 0,
      isRunning: false,
      isReadyHover: true,
      lastTime: performance.now(),
      spawnTimer: 65,
      spawnedPipesCount: 0,
    };
    setScore(0);
    setLastDeathScore(null);
    setStatus("READY");
  };

  const jump = useCallback(() => {
    if (status === "READY") {
      gameRef.current.isReadyHover = false;
      gameRef.current.isRunning = true;
      gameRef.current.lastTime = performance.now();
      gameRef.current.birdV = -3.85;
      setStatus("PLAYING");
      return;
    }
    if (status === "PLAYING" && gameRef.current.isRunning) {
      gameRef.current.birdV = -3.85;
    }
  }, [status]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && (status === "READY" || status === "PLAYING")) {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId: number;

    const GRAVITY = 0.175;
    const MAX_FALL_SPEED = 4.6;
    const BASE_PIPE_SPEED = 2.15;

    const render = (now: number) => {
      const state = gameRef.current;
      const dt = state.lastTime
        ? Math.min((now - state.lastTime) / 16.67, 2.2)
        : 1;
      state.lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, "#E6F1F8");
      skyGrad.addColorStop(1, "#F7F4EB");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(85, 50, 18, 0, Math.PI * 2);
      ctx.arc(105, 48, 22, 0, Math.PI * 2);
      ctx.arc(125, 52, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(290, 75, 15, 0, Math.PI * 2);
      ctx.arc(310, 72, 20, 0, Math.PI * 2);
      ctx.arc(328, 76, 14, 0, Math.PI * 2);
      ctx.fill();

      if (state.isReadyHover) {
        state.frameCount += dt;
        state.birdY = 130 + Math.sin(state.frameCount * 0.08) * 6;
      } else if (state.isRunning) {
        state.frameCount += dt;
        state.spawnTimer += dt;

        const difficultyRatio = Math.min(state.currentScore / 49, 1);
        const currentSpeed = BASE_PIPE_SPEED + difficultyRatio * 1.15;
        const spawnInterval = Math.max(66, 94 - difficultyRatio * 24);

        state.birdV = Math.min(state.birdV + GRAVITY * dt, MAX_FALL_SPEED);
        state.birdY += state.birdV * dt;

        if (state.spawnTimer >= spawnInterval) {
          state.spawnTimer = 0;
          state.spawnedPipesCount += 1;
          const pipeIndex = state.spawnedPipesCount;

          const isTrapPipe =
            pipeIndex >= 50 ||
            state.currentScore >= CONFIG.game2.flappyTrapScore;
          const currentGap = isTrapPipe
            ? 0
            : Math.max(66, 94 - difficultyRatio * 24);

          const minTop = 26;
          const maxTop = canvas.height - currentGap - 45;
          const topHeight = isTrapPipe
            ? canvas.height / 2
            : Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

          state.pipes.push({
            x: canvas.width,
            topHeight,
            baseTopHeight: topHeight,
            gap: currentGap,
            passed: false,
            isTrapPipe,
            pipeIndex,
            oscPhase: Math.random() * Math.PI * 2,
            oscSpeed:
              pipeIndex >= 15 && !isTrapPipe
                ? 0.035 + difficultyRatio * 0.035
                : 0,
          });
        }

        for (let i = state.pipes.length - 1; i >= 0; i--) {
          const p = state.pipes[i];
          p.x -= currentSpeed * dt;

          if (p.oscSpeed > 0) {
            p.oscPhase += p.oscSpeed * dt;
            p.topHeight = p.baseTopHeight + Math.sin(p.oscPhase) * 18;
          }

          if (p.isTrapPipe) {
            p.gap = 0;
            p.topHeight = canvas.height / 2;
          }

          ctx.fillStyle = p.isTrapPipe ? "#C96A6A" : "#93BCD6";
          ctx.strokeStyle = p.isTrapPipe ? "#9E4747" : "#5B89A6";
          ctx.lineWidth = 2;

          ctx.fillRect(p.x, 0, 44, p.topHeight);
          ctx.strokeRect(p.x, 0, 44, p.topHeight);
          ctx.fillRect(p.x - 3, Math.max(0, p.topHeight - 12), 50, 12);
          ctx.strokeRect(p.x - 3, Math.max(0, p.topHeight - 12), 50, 12);

          const bottomY = p.topHeight + p.gap;
          const bottomH = canvas.height - bottomY;
          ctx.fillRect(p.x, bottomY, 44, bottomH);
          ctx.strokeRect(p.x, bottomY, 44, bottomH);
          ctx.fillRect(p.x - 3, bottomY, 50, 12);
          ctx.strokeRect(p.x - 3, bottomY, 50, 12);

          if (p.isTrapPipe) {
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 10px Be Vietnam Pro, sans-serif";
            ctx.fillText("🔒 KHÓA 49", p.x - 4, canvas.height / 2 - 18);
          }

          const birdX = 72;
          const birdR = 10;
          if (birdX + birdR > p.x && birdX - birdR < p.x + 44) {
            if (
              p.isTrapPipe ||
              state.birdY - birdR < p.topHeight ||
              state.birdY + birdR > bottomY
            ) {
              state.isRunning = false;
              const finalScore = state.currentScore;
              setLastDeathScore(finalScore);
              if (finalScore > state.bestScore) {
                state.bestScore = finalScore;
                setBestScore(finalScore);
              }
              if (finalScore >= CONFIG.game2.flappyTrapScore) {
                setDeathsAt49((prev) => prev + 1);
              }
              setStatus("GAMEOVER");
            }
          }

          if (!p.passed && !p.isTrapPipe && p.x + 44 < birdX) {
            p.passed = true;
            state.currentScore = Math.min(
              CONFIG.game2.flappyTrapScore,
              state.currentScore + pointsPerPipe,
            );
            setScore(state.currentScore);
          }

          if (p.x < -60) {
            state.pipes.splice(i, 1);
          }
        }

        if (state.birdY + 11 > canvas.height || state.birdY - 11 < 0) {
          state.isRunning = false;
          const finalScore = state.currentScore;
          setLastDeathScore(finalScore);
          if (finalScore > state.bestScore) {
            state.bestScore = finalScore;
            setBestScore(finalScore);
          }
          if (finalScore >= CONFIG.game2.flappyTrapScore) {
            setDeathsAt49((prev) => prev + 1);
          }
          setStatus("GAMEOVER");
        }
      }

      ctx.save();
      ctx.translate(72, state.birdY);
      const tilt = Math.max(-0.35, Math.min(0.45, state.birdV * 0.08));
      ctx.rotate(tilt);

      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = "#5B89A6";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#FFFFFF";
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-3, 2, 6, 4, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = "#B8D6EA";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(5, -3, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#1D3040";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(12, -2);
      ctx.lineTo(19, 1);
      ctx.lineTo(12, 4);
      ctx.closePath();
      ctx.fillStyle = "#E5A952";
      ctx.fill();
      ctx.restore();

      if (state.isReadyHover || state.isRunning) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (status === "READY" || status === "PLAYING") {
      animationFrameId = requestAnimationFrame(render);
    } else {
      render(performance.now());
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [status, targetScore, pointsPerPipe]);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-[400px] mb-3 px-1">
        <span className="text-xs font-medium text-[#546E82]">
          Mục tiêu:{" "}
          <strong className="text-[#283E52]">{targetScore} cột</strong> (+
          {pointsPerPipe} điểm/cột)
        </span>
        <div className="flex items-center gap-2">
          {bestScore > 0 && (
            <span className="text-xs text-[#5E788C] bg-[#EAF1F6] px-2.5 py-1 rounded-full">
              Kỷ lục: <strong>{bestScore}/50</strong>
            </span>
          )}
          <span className="text-xs sm:text-sm font-bold text-[#487594] bg-[#E3EFF7] px-3 py-1 rounded-full border border-[#B5D0E3]">
            Điểm: {score} / {targetScore}
          </span>
        </div>
      </div>

      <div
        onMouseDown={jump}
        onTouchStart={(e) => {
          e.preventDefault();
          jump();
        }}
        className="relative w-full max-w-[400px] rounded-2xl overflow-hidden border-2 border-[#C2D8E8] shadow-inner cursor-pointer select-none bg-[#E6F1F8] touch-none"
      >
        <canvas
          ref={canvasRef}
          width={400}
          height={260}
          className="block w-full h-auto"
        />

        {status === "IDLE" && (
          <div className="absolute inset-0 bg-[#FAF8F2]/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
            <p className="text-sm text-[#283E52] font-semibold mb-1">
              Thử thách Chim Xanh Vượt Đại Dương 🐦
            </p>
            <p className="text-xs text-[#546E82] mb-4 max-w-xs">
              Mỗi cột vượt qua được <strong>+1 điểm</strong>. Tốc độ sẽ tăng dần
              và cột sẽ di chuyển khi điểm cao. Đạt đủ {targetScore} cột để lấy
              mật khẩu!
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startGame();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#5B89A6] hover:bg-[#487594] text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
            >
              Bắt đầu bay
            </button>
          </div>
        )}

        {status === "READY" && (
          <div className="absolute inset-0 bg-[#283E52]/10 flex flex-col items-center justify-end pb-5 pointer-events-none px-3 text-center">
            <div className="bg-white/95 px-4 py-2 rounded-full shadow-sm border border-[#C2D8E8] animate-bounce">
              <p className="text-[11px] sm:text-xs font-semibold text-[#3B6480]">
                👆 Chạm vào màn hình hoặc nhấn phím Space để bay!
              </p>
            </div>
          </div>
        )}

        {status === "GAMEOVER" && (
          <div className="absolute inset-0 bg-[#FAF8F2]/95 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 sm:p-5 text-center animate-fadeIn">
            {(lastDeathScore ?? 0) >= CONFIG.game2.flappyTrapScore ? (
              <>
                <span className="text-xl sm:text-2xl mb-1">😈🔒</span>
                <p className="text-xs sm:text-sm font-bold text-[#B84A4A] mb-1">
                  49/50 ĐIỂM — CỘT THỨ 50 ĐÃ BỊ KHÓA KÍN!
                </p>
                <p className="text-[11px] sm:text-xs text-[#546E82] mb-3 max-w-xs leading-relaxed">
                  Haha! Bạn bay siêu đỉnh nhưng hệ thống đã cố tình{" "}
                  <strong>khóa ở điểm 49</strong> rồi, không ai vượt qua được
                  cột thứ 50 đâu! Chọn <strong>&ldquo;Thật&rdquo;</strong> để mở
                  khóa mật khẩu nhé!
                </p>
              </>
            ) : (
              <>
                <p className="text-xs sm:text-sm font-bold text-[#B85656] mb-1">
                  Va chạm mất rồi! ({lastDeathScore ?? 0}/{targetScore} cột)
                </p>
                <p className="text-[11px] sm:text-xs text-[#546E82] mb-3 max-w-xs">
                  {(lastDeathScore ?? 0) >= 20
                    ? "Càng về cuối cột càng hẹp và nhấp nhô khó lường! Liệu có ai chạm nổi mốc 50?"
                    : "Cẩn thận nhịp vỗ cánh nhé, tốc độ sẽ tăng dần theo điểm số đấy!"}
                </p>
              </>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
                className="px-3.5 py-2 rounded-xl bg-[#E6F0F7] hover:bg-[#D4E5F2] text-[#283E52] text-xs font-semibold transition-all cursor-pointer border border-[#B5D0E3]"
              >
                Thử lại lần nữa 🔄
              </button>

              {onSwitchToTruth && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwitchToTruth();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#5B89A6] hover:bg-[#487594] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Đầu hàng & Chọn &ldquo;Thật&rdquo; 💌
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#5E788C] mt-2 text-center px-2">
        {deathsAt49 > 0
          ? "🤭 Bí mật nhỏ: Chế độ Thách bị khóa ở 49 điểm, hãy bấm sang nút 'Thật' ở trên để lấy mật khẩu nhé!"
          : "Mẹo: Chạm nhẹ vào khung trò chơi hoặc nhấn phím Space nhịp nhàng để giữ độ cao."}
      </p>
    </div>
  );
}

// ============================================================================
// COMPONENT 2: TRANG GIẢI MÃ (RESPONSIVE CHO CẢ ĐIỆN THOẠI & MÁY TÍNH)
// ============================================================================
function GameBoard({
  unlockedDigits,
  onUnlockDigit,
  onBackToLogin,
}: {
  unlockedDigits: Array<string | null>;
  onUnlockDigit: (idx: number, digit: string) => void;
  onBackToLogin: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(() => {
    const firstLocked = unlockedDigits.findIndex((d) => d === null);
    return firstLocked === -1 ? 0 : firstLocked;
  });

  const [g1Selected, setG1Selected] = useState<string | null>(null);
  const [g1Status, setG1Status] = useState<"IDLE" | "WRONG" | "WON">("IDLE");
  const g1ResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [g2Mode, setG2Mode] = useState<"TRUTH" | "DARE" | null>(null);
  const [truthAnswers, setTruthAnswers] = useState<string[]>(
    Array(CONFIG.game2.truthQuestions.length).fill(""),
  );
  const [isSendingTruth, setIsSendingTruth] = useState(false);
  const [truthError, setTruthError] = useState("");

  const [g3Questions, setG3Questions] = useState(() =>
    createShuffledGame3Questions(),
  );
  const [g3Index, setG3Index] = useState(0);
  const [g3SelectedOpt, setG3SelectedOpt] = useState<number | null>(null);
  const [g3AnswerState, setG3AnswerState] = useState<
    "IDLE" | "CORRECT" | "WRONG"
  >("IDLE");
  const g3ResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mathInput, setMathInput] = useState("");
  const [wrongCount, setWrongCount] = useState(0);
  const [mathFeedback, setMathFeedback] = useState("");
  const [showTeaseModal, setShowTeaseModal] = useState(false);

  const shuffleGame3 = useCallback(() => {
    setG3Questions(createShuffledGame3Questions());
    setG3Index(0);
    setG3SelectedOpt(null);
    setG3AnswerState("IDLE");
  }, []);

  useEffect(() => {
    return () => {
      if (g1ResetTimerRef.current) clearTimeout(g1ResetTimerRef.current);
      if (g3ResetTimerRef.current) clearTimeout(g3ResetTimerRef.current);
    };
  }, []);

  const handleGame1Select = (optId: string) => {
    if (unlockedDigits[0] !== null || g1Status === "WRONG") return;
    setG1Selected(optId);

    if (optId === CONFIG.game1.correctAnswer) {
      setG1Status("WON");
      onUnlockDigit(0, CONFIG.game1.digit);
    } else {
      setG1Status("WRONG");
      if (g1ResetTimerRef.current) clearTimeout(g1ResetTimerRef.current);
      g1ResetTimerRef.current = setTimeout(() => {
        setG1Selected(null);
        setG1Status("IDLE");
      }, CONFIG.game1.resetDelayMs || 2200);
    }
  };

  const handleTruthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasEmpty = truthAnswers.some((ans) => !ans.trim());
    if (hasEmpty) {
      setTruthError(
        "Bạn hãy điền đầy đủ cả 7 câu trả lời thật lòng trước khi gửi nhé!",
      );
      return;
    }
    setTruthError("");
    setIsSendingTruth(true);

    const payload = {
      type: "TRUTH_GAME_ANSWERS",
      timestamp: new Date().toISOString(),
      data: CONFIG.game2.truthQuestions.map((q, idx) => ({
        question: q,
        answer: truthAnswers[idx],
      })),
    };

    await sendToGoogleOrWebhook(payload);
    setIsSendingTruth(false);
    onUnlockDigit(1, CONFIG.game2.digit);
  };

  const handleGame3Answer = (optionIdx: number) => {
    if (
      unlockedDigits[2] !== null ||
      g3Questions.length === 0 ||
      g3AnswerState !== "IDLE"
    )
      return;
    const currentQ = g3Questions[g3Index];
    setG3SelectedOpt(optionIdx);

    if (optionIdx === currentQ.correct) {
      setG3AnswerState("CORRECT");
      setTimeout(() => {
        const nextIdx = g3Index + 1;
        if (nextIdx >= CONFIG.game3.targetStreak) {
          onUnlockDigit(2, CONFIG.game3.digit);
        } else {
          setG3Index(nextIdx);
          setG3SelectedOpt(null);
          setG3AnswerState("IDLE");
        }
      }, 750);
    } else {
      setG3AnswerState("WRONG");
      if (g3ResetTimerRef.current) clearTimeout(g3ResetTimerRef.current);
      g3ResetTimerRef.current = setTimeout(() => {
        shuffleGame3();
      }, CONFIG.game3.resetDelayMs || 2200);
    }
  };

  const hasMathText = mathInput.trim().length > 0;

  const handleMathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockedDigits[3] !== null || !hasMathText) return;

    if (mathInput.trim() === CONFIG.game4.correctAnswer) {
      setMathFeedback("");
      onUnlockDigit(3, CONFIG.game4.digit);
    } else {
      const nextWrong = wrongCount + 1;
      setWrongCount(nextWrong);
      if (nextWrong > CONFIG.game4.maxWrongAttempts) {
        setShowTeaseModal(true);
        setMathInput(CONFIG.game4.correctAnswer);
        onUnlockDigit(3, CONFIG.game4.digit);
      } else {
        setMathFeedback(
          `Chưa đúng rồi! Bạn đã tính sai ${nextWrong}/${CONFIG.game4.maxWrongAttempts} lần.`,
        );
      }
    }
  };

  const allUnlocked = unlockedDigits.every((d) => d !== null);
  const isCurrentStepDone = unlockedDigits[currentStep] !== null;

  return (
    <div className="min-h-[100dvh] pb-24 relative z-10">
      <header className="sticky top-0 z-30 bg-[#FAF8F2]/95 backdrop-blur-md border-b border-[#D8E5EE] shadow-sm">
        <div className="max-w-3xl mx-auto px-3.5 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onBackToLogin}
              className="text-xs font-medium text-[#486880] hover:text-[#283E52] px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#EAF1F6] hover:bg-[#DAE7F0] transition-colors cursor-pointer"
            >
              ← Đăng nhập
            </button>
            <span className="text-xs text-[#647F94] hidden md:inline">
              Hoàn thành lần lượt 4 thử thách để tìm mật khẩu
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-[#486880]">
              Mật khẩu:
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {unlockedDigits.map((digit, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  title={`Chuyển tới Màn ${idx + 1}`}
                  className={`w-8 h-9 sm:w-9 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-300 cursor-pointer ${
                    digit !== null
                      ? "bg-[#5B89A6] text-white shadow-sm scale-105"
                      : currentStep === idx
                        ? "bg-[#E6F0F7] border-2 border-[#5B89A6] text-[#5B89A6]"
                        : "bg-[#F0ECE1] border border-[#D4DFE8] text-[#95ACB8]"
                  }`}
                >
                  {digit !== null ? digit : "_"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3.5 sm:px-4 pt-5 sm:pt-7">
        {/* Lưới 2 cột trên điện thoại, 4 cột trên máy tính để không bị tràn chữ */}
        <div className="mb-5 sm:mb-7">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {[
              { idx: 0, label: "Màn 1: Trắc nghiệm" },
              { idx: 1, label: "Màn 2: Thật / Thách" },
              { idx: 2, label: "Màn 3: Triệu Phú" },
              { idx: 3, label: "Màn 4: Giải Toán" },
            ].map((tab) => {
              const done = unlockedDigits[tab.idx] !== null;
              const active = currentStep === tab.idx;
              const canAccess =
                tab.idx === 0 || unlockedDigits[tab.idx - 1] !== null || done;

              return (
                <button
                  key={tab.idx}
                  type="button"
                  disabled={!canAccess}
                  onClick={() => canAccess && setCurrentStep(tab.idx)}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 border ${
                    active
                      ? "bg-[#283E52] text-white border-[#283E52] shadow-sm"
                      : done
                        ? "bg-[#E6F4EA] text-[#2E6B40] border-[#B7DFC2] cursor-pointer"
                        : canAccess
                          ? "bg-white/80 text-[#546E82] border-[#D8E5EE] hover:bg-white cursor-pointer"
                          : "bg-[#F2EFE7]/60 text-[#A5B4BF] border-[#E6E2D6] cursor-not-allowed"
                  }`}
                >
                  <span>{done ? "✓" : `${tab.idx + 1}.`}</span>
                  <span className="truncate">{tab.label.split(": ")[1]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {allUnlocked && (
          <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#E3EFF7] via-[#F5F2E6] to-[#E6F0F7] border border-[#B5D0E3] shadow-md text-center animate-fadeIn">
            <p className="text-xs uppercase tracking-widest text-[#487594] font-semibold mb-1">
              🎉 Chúc mừng bạn đã giải mã hoàn tất
            </p>
            <h2 className="font-serif-vn text-xl sm:text-2xl font-bold text-[#283E52] mb-3">
              Mật khẩu hoàn chỉnh:{" "}
              <span className="tracking-widest text-[#487594]">
                {unlockedDigits.join("")}
              </span>
            </h2>
            <button
              onClick={onBackToLogin}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#283E52] hover:bg-[#1D2F3F] text-white text-sm font-medium shadow-md transition-all cursor-pointer"
            >
              Quay lại trang Đăng nhập ngay →
            </button>
          </div>
        )}

        <div className="bg-[#FAF8F2]/95 backdrop-blur-md border border-[#D8E5EE] rounded-3xl p-5 sm:p-6 md:p-8 shadow-[0_16px_40px_rgba(52,82,108,0.07)] transition-all">
          {currentStep === 0 && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#487594] bg-[#E6F0F7] px-3 py-1 rounded-full">
                  Trò chơi 1 / 4 • Trắc nghiệm
                </span>
                {unlockedDigits[0] !== null && (
                  <span className="text-xs font-semibold text-[#2E6B40] bg-[#E6F4EA] px-3 py-1 rounded-full">
                    ✓ Đã mở số [{unlockedDigits[0]}]
                  </span>
                )}
              </div>

              <h3 className="font-serif-vn text-lg sm:text-xl font-semibold text-[#283E52] mb-2">
                Câu hỏi mở màn
              </h3>
              <p className="text-sm text-[#4A6275] mb-5 sm:mb-6 leading-relaxed">
                {CONFIG.game1.question}
              </p>

              <div className="space-y-2.5 sm:space-y-3">
                {CONFIG.game1.options.map((opt) => {
                  const isCorrectOpt = opt.id === CONFIG.game1.correctAnswer;
                  const isChosen = g1Selected === opt.id;
                  const showResult =
                    g1Selected !== null || unlockedDigits[0] !== null;

                  let optionStyle =
                    "bg-white border-[#D8E5EE] text-[#334B5E] hover:border-[#7BA7C4]";
                  let badgeStyle = "bg-[#EDF3F8] text-[#546E82]";

                  if (showResult) {
                    if (
                      isCorrectOpt &&
                      (isChosen ||
                        g1Status === "WRONG" ||
                        unlockedDigits[0] !== null)
                    ) {
                      optionStyle =
                        "bg-[#EBF7EE] border-[#5BB377] text-[#1F5730] font-medium shadow-sm";
                      badgeStyle = "bg-[#439E5E] text-white";
                    } else if (isChosen && !isCorrectOpt) {
                      optionStyle =
                        "bg-[#FDECEC] border-[#E07A7A] text-[#9E2A2A] font-medium";
                      badgeStyle = "bg-[#D9534F] text-white";
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleGame1Select(opt.id)}
                      disabled={
                        unlockedDigits[0] !== null || g1Status === "WRONG"
                      }
                      className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm transition-all flex items-start gap-3 cursor-pointer ${optionStyle}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${badgeStyle}`}
                      >
                        {showResult &&
                        isCorrectOpt &&
                        (isChosen ||
                          g1Status === "WRONG" ||
                          unlockedDigits[0] !== null)
                          ? "✓"
                          : showResult && isChosen && !isCorrectOpt
                            ? "✗"
                            : opt.id}
                      </span>
                      <span className="flex-1">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {g1Status === "WRONG" && unlockedDigits[0] === null && (
                <p className="mt-4 text-xs text-[#B84A4A] bg-[#FDECEC] p-3 rounded-xl border border-[#F5C2C2] animate-fadeIn">
                  Chưa đúng rồi! Hãy quan sát đáp án đúng (màu xanh lá), bảng
                  chọn sẽ tự động làm mới sau giây lát để bạn chọn lại nhé...
                </p>
              )}
              {unlockedDigits[0] !== null && (
                <div className="mt-5 p-4 rounded-2xl bg-[#EBF7EE] border border-[#B7DFC2] text-xs text-[#255C36] font-medium">
                  🎉 Tuyệt vời! Chữ số thứ 1 của mật khẩu là:{" "}
                  <strong className="text-sm">[{CONFIG.game1.digit}]</strong>
                </div>
              )}
            </section>
          )}

          {currentStep === 1 && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#487594] bg-[#E6F0F7] px-3 py-1 rounded-full">
                  Trò chơi 2 / 4 • Truth or Dare
                </span>
                {unlockedDigits[1] !== null && (
                  <span className="text-xs font-semibold text-[#2E6B40] bg-[#E6F4EA] px-3 py-1 rounded-full">
                    ✓ Đã mở số [{unlockedDigits[1]}]
                  </span>
                )}
              </div>

              <h3 className="font-serif-vn text-lg sm:text-xl font-semibold text-[#283E52] mb-2">
                Thật hay Thách?
              </h3>
              <p className="text-xs sm:text-sm text-[#4A6275] mb-5 leading-relaxed">
                Chọn <strong>Thật</strong> để trả lời 7 câu hỏi tâm sự, hoặc
                chọn <strong>Thách</strong> để vượt qua 50 chướng ngại vật
                Flappy Bird!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-5 sm:mb-6">
                <button
                  type="button"
                  onClick={() => setG2Mode("TRUTH")}
                  className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-medium border transition-all cursor-pointer ${
                    g2Mode === "TRUTH"
                      ? "bg-[#5B89A6] text-white border-[#5B89A6] shadow-sm"
                      : "bg-white text-[#334B5E] border-[#D8E5EE] hover:border-[#5B89A6]"
                  }`}
                >
                  💌 Chọn Thật (7 câu hỏi)
                </button>
                <button
                  type="button"
                  onClick={() => setG2Mode("DARE")}
                  className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-medium border transition-all cursor-pointer ${
                    g2Mode === "DARE"
                      ? "bg-[#3A627D] text-white border-[#3A627D] shadow-sm"
                      : "bg-white text-[#334B5E] border-[#D8E5EE] hover:border-[#5B89A6]"
                  }`}
                >
                  🐦 Chọn Thách (50 cột)
                </button>
              </div>

              {g2Mode === "DARE" && (
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#D8E5EE]">
                  <FlappyBirdGame
                    targetScore={CONFIG.game2.flappyTargetScore}
                    pointsPerPipe={CONFIG.game2.flappyPointsPerPipe}
                    onSwitchToTruth={() => setG2Mode("TRUTH")}
                  />
                </div>
              )}

              {g2Mode === "TRUTH" && (
                <form
                  onSubmit={handleTruthSubmit}
                  className="space-y-3.5 bg-white p-4 sm:p-5 rounded-2xl border border-[#D8E5EE] max-h-[55vh] sm:max-h-[420px] overflow-y-auto custom-scrollbar"
                >
                  {CONFIG.game2.truthQuestions.map((q, idx) => (
                    <div key={idx}>
                      <label className="block text-xs font-medium text-[#334B5E] mb-1">
                        {q}
                      </label>
                      <input
                        type="text"
                        disabled={unlockedDigits[1] !== null}
                        value={truthAnswers[idx]}
                        onChange={(e) => {
                          const next = [...truthAnswers];
                          next[idx] = e.target.value;
                          setTruthAnswers(next);
                        }}
                        placeholder="Viết câu trả lời của bạn..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F2] border border-[#D8E5EE] text-sm sm:text-xs text-[#283E52] focus:outline-none focus:border-[#5B89A6]"
                      />
                    </div>
                  ))}

                  {truthError && (
                    <p className="text-xs text-[#B84A4A]">{truthError}</p>
                  )}

                  {unlockedDigits[1] === null && (
                    <button
                      type="submit"
                      disabled={isSendingTruth}
                      className="w-full py-3 rounded-xl bg-[#5B89A6] hover:bg-[#487594] text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      {isSendingTruth
                        ? "Đang lưu vào biểu mẫu..."
                        : "Gửi câu trả lời & Nhận chữ số thứ 2"}
                    </button>
                  )}
                </form>
              )}

              {unlockedDigits[1] !== null && (
                <div className="mt-5 p-4 rounded-2xl bg-[#EBF7EE] border border-[#B7DFC2] text-xs text-[#255C36] font-medium">
                  🎉 Hoàn thành xuất sắc! Chữ số thứ 2 của mật khẩu là:{" "}
                  <strong className="text-sm">[{CONFIG.game2.digit}]</strong>
                </div>
              )}
            </section>
          )}

          {currentStep === 2 && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#487594] bg-[#E6F0F7] px-3 py-1 rounded-full">
                  Trò chơi 3 / 4 • Ai Là Triệu Phú
                </span>
                {unlockedDigits[2] !== null ? (
                  <span className="text-xs font-semibold text-[#2E6B40] bg-[#E6F4EA] px-3 py-1 rounded-full">
                    ✓ Đã mở số [{unlockedDigits[2]}]
                  </span>
                ) : (
                  <span className="text-xs font-bold text-[#487594]">
                    Chuỗi đúng: {g3Index} / {CONFIG.game3.targetStreak}
                  </span>
                )}
              </div>

              <h3 className="font-serif-vn text-lg sm:text-xl font-semibold text-[#283E52] mb-1">
                Chế độ Sinh Tồn 10 Câu Liên Tiếp
              </h3>
              <p className="text-xs text-[#546E82] mb-4">
                Trả lời đúng liên tiếp 10 câu. Nếu chọn sai, hệ thống sẽ tô{" "}
                <strong>màu đỏ</strong> ô sai kèm <strong>màu xanh</strong> đáp
                án đúng trong giây lát rồi tự động quay về Câu 1!
              </p>

              <div className="w-full h-2 bg-[#E6EFF5] rounded-full overflow-hidden mb-5">
                <div
                  className="h-full bg-[#5B89A6] transition-all duration-300"
                  style={{
                    width: `${
                      unlockedDigits[2] !== null
                        ? 100
                        : (g3Index / CONFIG.game3.targetStreak) * 100
                    }%`,
                  }}
                />
              </div>

              {unlockedDigits[2] === null && g3Questions[g3Index] && (
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#D8E5EE]">
                  <p className="text-xs font-semibold text-[#487594] mb-1">
                    Câu hỏi {g3Index + 1} / {CONFIG.game3.targetStreak}:
                  </p>
                  <p className="text-sm font-medium text-[#283E52] mb-4 leading-relaxed">
                    {g3Questions[g3Index].q}
                  </p>
                  <div className="space-y-2.5">
                    {g3Questions[g3Index].options.map((optText, idx) => {
                      const isCorrectOpt = idx === g3Questions[g3Index].correct;
                      const isSelected = g3SelectedOpt === idx;

                      let btnClass =
                        "bg-[#FAF8F2] hover:bg-[#EAF2F8] border-[#D8E5EE] text-[#334B5E]";
                      let badgeClass =
                        "bg-white text-[#546E82] border border-[#D8E5EE]";

                      if (g3AnswerState !== "IDLE") {
                        if (isCorrectOpt) {
                          btnClass =
                            "bg-[#EBF7EE] border-[#5BB377] text-[#1F5730] font-semibold shadow-sm";
                          badgeClass =
                            "bg-[#439E5E] text-white border-[#439E5E]";
                        } else if (isSelected && !isCorrectOpt) {
                          btnClass =
                            "bg-[#FDECEC] border-[#E07A7A] text-[#9E2A2A] font-semibold";
                          badgeClass =
                            "bg-[#D9534F] text-white border-[#D9534F]";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={g3AnswerState !== "IDLE"}
                          onClick={() => handleGame3Answer(idx)}
                          className={`w-full text-left px-3.5 sm:px-4 py-3 rounded-xl border text-xs transition-all flex items-center gap-3 cursor-pointer ${btnClass}`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${badgeClass}`}
                          >
                            {g3AnswerState !== "IDLE" && isCorrectOpt
                              ? "✓"
                              : g3AnswerState !== "IDLE" &&
                                  isSelected &&
                                  !isCorrectOpt
                                ? "✗"
                                : String.fromCharCode(65 + idx)}
                          </span>
                          <span className="flex-1">{optText}</span>
                        </button>
                      );
                    })}
                  </div>

                  {g3AnswerState === "WRONG" && (
                    <div className="mt-4 p-3.5 rounded-xl bg-[#FDECEC] border border-[#F5C2C2] text-center animate-fadeIn">
                      <p className="text-xs text-[#9E2A2A] font-medium">
                        ⏳ Tiếc quá, sai ở câu {g3Index + 1} rồi! Đáp án đúng đã
                        được tô xanh lá. Đang tự động đặt lại từ Câu 1...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {unlockedDigits[2] !== null && (
                <div className="mt-4 p-4 rounded-2xl bg-[#EBF7EE] border border-[#B7DFC2] text-xs text-[#255C36] font-medium">
                  🎉 Đỉnh cao! Bạn đã vượt qua đủ 10 câu liên tiếp. Chữ số thứ 3
                  của mật khẩu là:{" "}
                  <strong className="text-sm">[{CONFIG.game3.digit}]</strong>
                </div>
              )}
            </section>
          )}

          {currentStep === 3 && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#487594] bg-[#E6F0F7] px-3 py-1 rounded-full">
                  Trò chơi 4 / 4 • Giải Toán
                </span>
                {unlockedDigits[3] !== null && (
                  <span className="text-xs font-semibold text-[#2E6B40] bg-[#E6F4EA] px-3 py-1 rounded-full">
                    ✓ Đã mở số [{unlockedDigits[3]}]
                  </span>
                )}
              </div>

              <h3 className="font-serif-vn text-lg sm:text-xl font-semibold text-[#283E52] mb-2">
                Thử thách tính nhẩm cuối cùng
              </h3>
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#D8E5EE] mb-5">
                <p className="text-sm text-[#334B5E] leading-relaxed font-medium">
                  {CONFIG.game4.mathQuestion}
                </p>
              </div>

              <form
                onSubmit={handleMathSubmit}
                className="flex flex-col sm:flex-row gap-2.5 sm:gap-3"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={unlockedDigits[3] !== null}
                  value={mathInput}
                  onChange={(e) => setMathInput(e.target.value)}
                  placeholder="Nhập đáp án của bạn..."
                  className="flex-1 px-4 py-3 rounded-xl bg-white border border-[#D8E5EE] text-base sm:text-sm text-[#283E52] focus:outline-none focus:border-[#5B89A6]"
                />
                <button
                  type="submit"
                  disabled={unlockedDigits[3] !== null || !hasMathText}
                  className={`px-6 py-3 rounded-xl text-xs font-semibold transition-all ${
                    unlockedDigits[3] === null && hasMathText
                      ? "bg-[#5B89A6] hover:bg-[#487594] text-white shadow-[0_6px_16px_rgba(91,137,166,0.3)] cursor-pointer sm:scale-[1.02]"
                      : "bg-[#E6E3D8] text-[#9EA8A1] cursor-not-allowed"
                  }`}
                >
                  Gửi đáp án
                </button>
              </form>

              {mathFeedback && unlockedDigits[3] === null && (
                <p className="mt-3 text-xs text-[#B84A4A]">{mathFeedback}</p>
              )}

              {unlockedDigits[3] !== null && (
                <div className="mt-5 p-4 rounded-2xl bg-[#EBF7EE] border border-[#B7DFC2] text-xs text-[#255C36] font-medium">
                  🎉 Chính xác! Chữ số thứ 4 của mật khẩu là:{" "}
                  <strong className="text-sm">[{CONFIG.game4.digit}]</strong>
                </div>
              )}
            </section>
          )}

          <div className="mt-7 pt-5 border-t border-[#E2ECF2] flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                currentStep === 0
                  ? "text-[#B5C2CC] cursor-not-allowed"
                  : "text-[#486880] hover:bg-[#EAF1F6] cursor-pointer"
              }`}
            >
              ← Màn trước
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                disabled={!isCurrentStepDone}
                onClick={() => setCurrentStep((s) => Math.min(3, s + 1))}
                className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isCurrentStepDone
                    ? "bg-[#283E52] hover:bg-[#1D2F3F] text-white shadow-sm cursor-pointer animate-bounce"
                    : "bg-[#E8E5DC] text-[#A2B0BA] cursor-not-allowed"
                }`}
              >
                {isCurrentStepDone
                  ? "Sang Trò chơi tiếp theo →"
                  : "Hoàn thành để mở tiếp"}
              </button>
            ) : (
              allUnlocked && (
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="px-5 py-2.5 rounded-xl bg-[#5B89A6] hover:bg-[#487594] text-white text-xs font-semibold shadow-sm cursor-pointer"
                >
                  Dùng mật khẩu đăng nhập →
                </button>
              )
            )}
          </div>
        </div>
      </main>

      {showTeaseModal && (
        <div className="fixed inset-0 z-50 bg-[#1B2B38]/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF8F2] border border-[#D8E5EE] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-[#E6F0F7] flex items-center justify-center mx-auto mb-3 text-2xl">
              😜
            </div>
            <h4 className="font-serif-vn text-lg sm:text-xl font-bold text-[#283E52] mb-2">
              {CONFIG.game4.teasePopupTitle}
            </h4>
            <p className="text-xs sm:text-sm text-[#4A6275] leading-relaxed mb-5">
              {CONFIG.game4.teasePopupMessage}
            </p>
            <div className="p-3 rounded-xl bg-white border border-[#D8E5EE] text-xs text-[#283E52] mb-5">
              Đáp án đúng là:{" "}
              <strong className="text-base">
                {CONFIG.game4.correctAnswer}
              </strong>{" "}
              • Chữ số thứ 4:{" "}
              <strong className="text-base">[{CONFIG.game4.digit}]</strong>
            </div>
            <button
              onClick={() => setShowTeaseModal(false)}
              className="w-full py-3 rounded-xl bg-[#283E52] text-white text-xs font-semibold cursor-pointer"
            >
              Haha cảm ơn nha, nhận số luôn!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENT 3A: 14 BỨC ẢNH BÓNG BAY NGẪU NHIÊN LUÂN PHIÊN (RESPONSIVE MOBILE/DESKTOP)
// ============================================================================
const BALLOON_COLORS = [
  "#93BCD6",
  "#D6E6F2",
  "#E8DFCA",
  "#B3D1E6",
  "#CFE2EE",
  "#EFE7D6",
  "#F5DCE4",
  "#CBE8DF",
];

interface FloatingSlot {
  slotId: number;
  photoIndex: number;
  leftPercent: number;
  durationSec: number;
  delaySec: number;
  color: string;
  tiltDeg: number;
}

function createInitialBalloonSlots(): FloatingSlot[] {
  const photosCount = CONFIG.celebration.balloonPhotos.length; // 14 ảnh
  const baseLanes = [3, 12, 22, 31, 41, 50, 60, 69, 78, 86];
  return baseLanes.map((baseLeft, idx) => ({
    slotId: idx,
    photoIndex: idx % photosCount,
    leftPercent: baseLeft + ((idx * 3) % 5) - 2,
    durationSec: 18 + (idx % 5) * 2.5,
    delaySec: idx * 1.9,
    color: BALLOON_COLORS[idx % BALLOON_COLORS.length],
    tiltDeg: idx % 2 === 0 ? -2.2 : 2.2,
  }));
}

function BalloonsBackground() {
  const [slots, setSlots] = useState<FloatingSlot[]>(() =>
    createInitialBalloonSlots(),
  );

  const handleCycleIteration = useCallback((slotId: number) => {
    const photosCount = CONFIG.celebration.balloonPhotos.length;
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.slotId !== slotId) return slot;
        const randomStep = 1 + Math.floor(Math.random() * (photosCount - 1));
        const nextPhotoIdx = (slot.photoIndex + randomStep) % photosCount;
        const nextLeft = Math.floor(2 + Math.random() * 82);
        const nextColor =
          BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        const nextTilt = (Math.random() - 0.5) * 6;
        return {
          ...slot,
          photoIndex: nextPhotoIdx,
          leftPercent: nextLeft,
          color: nextColor,
          tiltDeg: nextTilt,
        };
      }),
    );
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {slots.map((slot) => {
        const photo =
          CONFIG.celebration.balloonPhotos[
            slot.photoIndex % CONFIG.celebration.balloonPhotos.length
          ];
        return (
          <div
            key={slot.slotId}
            onAnimationIteration={() => handleCycleIteration(slot.slotId)}
            style={{
              left: `${slot.leftPercent}%`,
              animationDuration: `${slot.durationSec}s`,
              animationDelay: `${slot.delaySec}s`,
            }}
            className="balloon-float absolute -bottom-72 flex flex-col items-center opacity-90 transition-[left] duration-700 scale-[0.78] sm:scale-100 origin-bottom"
          >
            <div
              style={{ backgroundColor: slot.color }}
              className="w-14 h-18 sm:w-16 sm:h-20 rounded-[50%_50%_48%_48%/55%_55%_45%_45%] shadow-[inset_-6px_-6px_14px_rgba(0,0,0,0.06)] relative flex items-center justify-center border border-white/50"
            >
              <div className="w-3 h-6 bg-white/45 rounded-full absolute top-3 left-3 rotate-[-25deg]" />
              <div
                style={{ backgroundColor: slot.color }}
                className="w-2.5 h-2 absolute -bottom-1 rotate-45"
              />
            </div>

            <div className="w-[1px] h-8 sm:h-10 bg-[#95AFC2]/70" />

            <div
              style={{ transform: `rotate(${slot.tiltDeg}deg)` }}
              className="bg-[#FAF8F2] p-1.5 sm:p-2 pb-2.5 sm:pb-3 rounded-xl shadow-[0_10px_25px_rgba(40,62,82,0.1)] border border-[#D8E5EE] w-24 sm:w-28"
            >
              <div className="w-7 sm:w-8 h-2.5 bg-[#CFE2EE]/80 mx-auto -mt-2.5 sm:-mt-3 mb-1 rounded-sm transform rotate-3" />
              <div className="w-21 h-21 sm:w-24 sm:h-24 mx-auto rounded-lg overflow-hidden bg-[#EAF1F6]">
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="text-[9px] sm:text-[10px] text-center text-[#466075] mt-1.5 font-medium truncate">
                {photo.caption}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// COMPONENT 3B: BÁNH SINH NHẬT 3D (TỰ ĐỘNG CĂN CHỈNH TỶ LỆ TRÊN MÀN HÌNH DỌC ĐIỆN THOẠI)
// ============================================================================
interface ThreeMeshGroupLike {
  visible: boolean;
  rotation: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  scale: { set: (x: number, y: number, z: number) => void };
}

function CandleFlame({
  position,
  candleState,
}: {
  position: [number, number, number];
  candleState: "UNLIT" | "LIT" | "BLOWING" | "BLOWN";
}) {
  const flameGroupRef = useRef<ThreeMeshGroupLike | null>(null);
  const smokeRef = useRef<ThreeMeshGroupLike | null>(null);
  const lightRef = useRef<{ intensity: number } | null>(null);
  const blowProgressRef = useRef(0);
  const smokeProgressRef = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    if (candleState === "LIT") {
      blowProgressRef.current = 0;
      smokeProgressRef.current = 0;
      if (flameGroupRef.current) {
        flameGroupRef.current.visible = true;
        flameGroupRef.current.rotation.z =
          Math.sin(t * 7 + position[0] * 4) * 0.08;
        flameGroupRef.current.rotation.x = Math.cos(t * 6) * 0.05;
        const s = 1 + Math.sin(t * 14 + position[0] * 10) * 0.1;
        flameGroupRef.current.scale.set(1, s, 1);
      }
      if (lightRef.current) {
        lightRef.current.intensity =
          1.25 + Math.sin(t * 15 + position[2] * 8) * 0.25;
      }
      if (smokeRef.current) {
        smokeRef.current.visible = false;
      }
    } else if (candleState === "BLOWING") {
      blowProgressRef.current = Math.min(
        1,
        blowProgressRef.current + delta * 0.65,
      );
      const p = blowProgressRef.current;

      if (flameGroupRef.current) {
        flameGroupRef.current.visible = p < 0.96;
        flameGroupRef.current.rotation.z = -p * 1.35 + Math.sin(t * 45) * 0.28;
        const scaleX = Math.max(
          0.05,
          (1 - p * 0.85) * (1 + Math.sin(t * 50) * 0.25),
        );
        const scaleY = Math.max(0.05, 1 + p * 0.6 - p * p * 1.4);
        flameGroupRef.current.scale.set(scaleX, scaleY, scaleX);
      }
      if (lightRef.current) {
        lightRef.current.intensity = Math.max(
          0,
          (1 - p) * 1.3 + Math.sin(t * 40) * 0.3,
        );
      }
      if (smokeRef.current) {
        smokeRef.current.visible = p > 0.35;
        smokeRef.current.position.y = 0.42 + (p - 0.35) * 0.7;
        smokeRef.current.position.x = (p - 0.35) * 0.45;
        const smokeScale = 0.4 + (p - 0.35) * 1.5;
        smokeRef.current.scale.set(smokeScale, smokeScale, smokeScale);
      }
    } else if (candleState === "BLOWN") {
      if (flameGroupRef.current) flameGroupRef.current.visible = false;
      if (lightRef.current) lightRef.current.intensity = 0;

      smokeProgressRef.current = Math.min(
        1,
        smokeProgressRef.current + delta * 0.5,
      );
      const sp = smokeProgressRef.current;
      if (smokeRef.current) {
        smokeRef.current.visible = sp < 0.95;
        smokeRef.current.position.y = 0.55 + sp * 0.8;
        smokeRef.current.position.x = 0.15 + sp * 0.4;
        const s = (1 - sp) * 1.2;
        smokeRef.current.scale.set(s, s, s);
      }
    } else {
      if (flameGroupRef.current) flameGroupRef.current.visible = false;
      if (lightRef.current) lightRef.current.intensity = 0;
      if (smokeRef.current) smokeRef.current.visible = false;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.36, 20]} />
        <meshStandardMaterial color="#FFFDF7" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.047, 0.047, 0.1, 20]} />
        <meshStandardMaterial color="#83B0CC" roughness={0.4} />
      </mesh>

      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.05, 8]} />
        <meshStandardMaterial color="#3A2E2B" />
      </mesh>

      <group
        ref={flameGroupRef as never}
        position={[0, 0.42, 0]}
        visible={false}
      >
        <pointLight
          ref={lightRef as never}
          color="#FFB84D"
          intensity={1.3}
          distance={4.5}
          decay={2}
        />
        <mesh position={[0, 0.06, 0]}>
          <coneGeometry args={[0.055, 0.18, 16]} />
          <meshStandardMaterial
            color="#FFD166"
            emissive="#FF8C1A"
            emissiveIntensity={2.6}
            transparent
            opacity={0.95}
          />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <sphereGeometry args={[0.036, 12, 12]} />
          <meshBasicMaterial color="#FFF8E7" />
        </mesh>
      </group>

      <group ref={smokeRef as never} position={[0, 0.45, 0]} visible={false}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.04, 10, 10]} />
          <meshStandardMaterial
            color="#DCE5EC"
            transparent
            opacity={0.45}
            roughness={1}
          />
        </mesh>
        <mesh position={[0.06, 0.09, 0]}>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshStandardMaterial
            color="#E6EEF4"
            transparent
            opacity={0.3}
            roughness={1}
          />
        </mesh>
      </group>
    </group>
  );
}

function BirthdayCakeModel({
  candleState,
}: {
  candleState: "UNLIT" | "LIT" | "BLOWING" | "BLOWN";
}) {
  const groupRef = useRef<{ rotation: { y: number } } | null>(null);
  const { viewport } = useThree();
  // Tự động thu gọn nhẹ tỷ lệ bánh kem khi xem trên màn hình dọc của điện thoại
  const responsiveScale = Math.min(1, Math.max(0.76, viewport.width / 3.4));

  const candlePositions: Array<[number, number, number]> = [
    [0, 0.95, 0],
    [0.36, 0.95, 0],
    [-0.36, 0.95, 0],
    [0, 0.95, 0.36],
    [0, 0.95, -0.36],
  ];

  const bottomPearls = useMemo<Array<[number, number, number]>>(() => {
    return Array.from({ length: 16 }).map((_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      return [Math.cos(angle) * 1.24, -0.25, Math.sin(angle) * 1.24];
    });
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.22;
    }
  });

  return (
    <Float speed={1.4} rotationIntensity={0.08} floatIntensity={0.25}>
      <group
        ref={groupRef as never}
        position={[0, -0.35, 0]}
        scale={responsiveScale}
      >
        <mesh position={[0, -0.35, 0]} receiveShadow>
          <cylinderGeometry args={[1.6, 1.42, 0.1, 48]} />
          <meshStandardMaterial
            color="#F7F5EE"
            roughness={0.25}
            metalness={0.05}
          />
        </mesh>

        <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.22, 1.22, 0.72, 48]} />
          <meshStandardMaterial color="#FAF3E3" roughness={0.45} />
        </mesh>

        {bottomPearls.map((pos, idx) => (
          <mesh key={idx} position={pos}>
            <sphereGeometry args={[0.055, 12, 12]} />
            <meshStandardMaterial color="#CFE2EE" roughness={0.35} />
          </mesh>
        ))}

        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[1.25, 1.25, 0.09, 48]} />
          <meshStandardMaterial color="#ACCBE0" roughness={0.35} />
        </mesh>

        <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.84, 0.84, 0.56, 48]} />
          <meshStandardMaterial color="#D8E9F5" roughness={0.45} />
        </mesh>

        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <group
              key={i}
              position={[Math.cos(angle) * 0.68, 0.97, Math.sin(angle) * 0.68]}
            >
              <mesh castShadow>
                <sphereGeometry args={[0.09, 16, 16]} />
                <meshStandardMaterial color="#FFFDF7" roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.06, 0]}>
                <sphereGeometry args={[0.045, 12, 12]} />
                <meshStandardMaterial color="#5B89A6" roughness={0.35} />
              </mesh>
            </group>
          );
        })}

        {candlePositions.map((pos, idx) => (
          <CandleFlame key={idx} position={pos} candleState={candleState} />
        ))}
      </group>
    </Float>
  );
}

// ============================================================================
// COMPONENT 3C: LÁ THƯ HIỆN LÊN VÀ MỞ RA NHƯ MỘT TRANG SÁCH (RESPONSIVE MOBILE)
// ============================================================================
function BookLetterInner({ onClose }: { onClose: () => void }) {
  const [bookOpened, setBookOpened] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBookOpened(true), 220);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-[#182633]/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="book-perspective w-full max-w-2xl">
        <div
          className={`relative bg-[#FAF8F2] border-2 border-[#CAD8E3] rounded-r-2xl sm:rounded-r-3xl rounded-l-xl shadow-[0_30px_80px_rgba(25,42,58,0.38)] overflow-hidden transition-all duration-1000 ${
            bookOpened ? "scale-100 opacity-100" : "scale-95 opacity-90"
          }`}
        >
          <div className="absolute top-0 bottom-0 left-0 w-4 sm:w-7 bg-gradient-to-r from-[#C2D3E0] via-[#E4EDF4] to-transparent pointer-events-none z-20" />

          <div className="absolute -top-1 right-6 sm:right-10 w-5 sm:w-6 h-12 sm:h-16 bg-[#5B89A6] shadow-md z-20 flex items-end justify-center pb-1 rounded-b-sm">
            <span className="text-[10px] text-white">✦</span>
          </div>

          <div
            className={`book-cover absolute inset-0 bg-gradient-to-br from-[#487594] to-[#2B4C66] z-30 flex flex-col items-center justify-center text-white p-6 sm:p-8 pointer-events-none ${
              bookOpened ? "book-cover-open" : ""
            }`}
          >
            <div className="border border-white/30 rounded-2xl p-6 sm:p-8 text-center">
              <span className="text-3xl mb-2 block">📖</span>
              <p className="text-xs uppercase tracking-[0.25em] text-[#CFE2EE] mb-2">
                Nhật Ký Tuổi Mới
              </p>
              <h3 className="font-serif-vn text-xl sm:text-2xl font-bold">
                Trang Sách Sinh Nhật
              </h3>
            </div>
          </div>

          <div className="p-5 sm:p-10 pl-7 sm:pl-14 max-h-[85dvh] sm:max-h-[82vh] flex flex-col">
            <div className="flex items-start justify-between gap-2 border-b border-[#D8E5EE] pb-3.5 sm:pb-4 mb-4 sm:mb-5 pr-8 sm:pr-10">
              <div>
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-[#5B89A6]">
                  🌊 Trang sách kỷ niệm • Lời chúc tuổi mới
                </span>
                <h2 className="font-serif-vn text-xl sm:text-3xl font-bold text-[#283E52] mt-0.5 leading-snug">
                  {CONFIG.celebration.letterTitle}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EAF1F6] hover:bg-[#DAE7F0] text-[#334B5E] flex items-center justify-center text-sm font-bold transition-colors cursor-pointer shrink-0"
                title="Gấp sách lại để ngắm bánh"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-1.5 sm:pr-2 space-y-3.5 sm:space-y-4 text-xs sm:text-[15px] text-[#2F4659] leading-relaxed whitespace-pre-line font-normal custom-scrollbar book-lines">
              {CONFIG.celebration.letterContent}

              <div className="pt-3 sm:pt-4 pb-2 text-right font-serif-vn italic text-[#487594] font-semibold text-sm sm:text-base">
                — {CONFIG.celebration.letterSign}
              </div>
            </div>

            <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-[#D8E5EE] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-[#6E879B] italic font-serif-vn">
                Trang 01 / 01
              </span>
              <button
                onClick={onClose}
                className="px-5 sm:px-6 py-2.5 rounded-xl bg-[#5B89A6] hover:bg-[#487594] text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                Ẩn trang sách & Ngắm bánh 3D 🎂
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookLetterModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return <BookLetterInner onClose={onClose} />;
}

// ============================================================================
// COMPONENT 4: TRANG TIỆM PHOTOBOOTH SINH NHẬT (RESPONSIVE ĐIỆN THOẠI & MÁY TÍNH)
// ============================================================================
export interface TrackedFacePose {
  detected: boolean;
  foreheadX: number;
  foreheadY: number;
  eyeCenterX: number;
  eyeCenterY: number;
  leftCheekX: number;
  leftCheekY: number;
  rightCheekX: number;
  rightCheekY: number;
  chinX: number;
  chinY: number;
  rollAngle: number;
  yawRatio: number;
  pitchRatio: number;
  faceScale: number;
}

const PHOTOBOOTH_FILTERS = [
  {
    id: "style_1",
    icon: "🩺👑",
    cssFilter: "brightness(1.07) contrast(0.97) saturate(1.06)",
    tint: "rgba(255, 250, 245, 0.08)",
    framePrimary: "#FCE8EE",
    frameSecondary: "#CFE6F7",
    accentColor: "#D4A359",
    patternType: "COQUETTE_PEARL",
    stickerText: "Dr. Princess ✨",
  },
  {
    id: "style_2",
    icon: "👩‍⚕️💊",
    cssFilter: "brightness(1.09) contrast(0.96) saturate(1.05)",
    tint: "rgba(220, 240, 255, 0.09)",
    framePrimary: "#D6EEFC",
    frameSecondary: "#FFF5D6",
    accentColor: "#4A88B0",
    patternType: "MEDICAL_CHART",
    stickerText: "Happy Doctor 🩺",
  },
  {
    id: "style_3",
    icon: "🐰🩹",
    cssFilter: "brightness(1.1) contrast(0.95) saturate(1.05)",
    tint: "rgba(255, 242, 246, 0.09)",
    framePrimary: "#FFDCE8",
    frameSecondary: "#FFFDF9",
    accentColor: "#E07A9B",
    patternType: "GINGHAM_LACE",
    stickerText: "Rx: 100% Joy 🍓",
  },
  {
    id: "style_4",
    icon: "👓💉",
    cssFilter: "brightness(1.07) contrast(0.97) sepia(0.04) saturate(1.06)",
    tint: "rgba(250, 244, 232, 0.08)",
    framePrimary: "#F7E8D0",
    frameSecondary: "#E0F2EA",
    accentColor: "#C28B48",
    patternType: "Y2K_WINDOW",
    stickerText: "Sweet Care 💝",
  },
  {
    id: "style_5",
    icon: "✨🏥",
    cssFilter: "brightness(1.08) contrast(0.96) saturate(1.08)",
    tint: "rgba(225, 236, 255, 0.09)",
    framePrimary: "#D8E4FC",
    frameSecondary: "#F4E0F8",
    accentColor: "#6384B8",
    patternType: "STAR_AURA",
    stickerText: "Super Doctor 🌙",
  },
  {
    id: "style_6",
    icon: "🌼🩺",
    cssFilter: "brightness(1.09) contrast(0.96) saturate(1.06)",
    tint: "rgba(250, 252, 240, 0.08)",
    framePrimary: "#E2F4DC",
    frameSecondary: "#FFF6CF",
    accentColor: "#6DA862",
    patternType: "BOTANICAL_DIARY",
    stickerText: "Best Doctor 🌼",
  },
  {
    id: "style_7",
    icon: "🎀🌡️",
    cssFilter: "brightness(1.1) contrast(0.95) saturate(1.05)",
    tint: "rgba(230, 244, 255, 0.09)",
    framePrimary: "#D8EEFC",
    frameSecondary: "#FDE2EC",
    accentColor: "#5D97BD",
    patternType: "CANDY_STRIPE",
    stickerText: "Love & Heal 🎀",
  },
  {
    id: "style_8",
    icon: "🐚💖",
    cssFilter: "brightness(1.08) contrast(0.97) sepia(0.03) saturate(1.1)",
    tint: "rgba(255, 240, 228, 0.09)",
    framePrimary: "#FFE2D4",
    frameSecondary: "#D6F0F7",
    accentColor: "#D97F64",
    patternType: "POLAROID_STAMP",
    stickerText: "Shining Doc 🐚",
  },
];

// --- BỘ HÀM VẼ ĐỒ HỌA CHỦ ĐỀ BÁC SĨ DỄ THƯƠNG + NHÂN VẬT CHIBI & TIỆC SINH NHẬT ---

function drawCornerSatinBow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color = "#F497B0",
  stroke = "#FFFFFF",
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = color;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(-4, 4);
  ctx.quadraticCurveTo(-16, 22, -22, 32);
  ctx.lineTo(-10, 30);
  ctx.quadraticCurveTo(-5, 18, 2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(4, 4);
  ctx.quadraticCurveTo(16, 22, 22, 32);
  ctx.lineTo(10, 30);
  ctx.quadraticCurveTo(5, 18, -2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-14, -2, 14, 9, -0.25, 0, Math.PI * 2);
  ctx.ellipse(14, -2, 14, 9, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -1, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFDF7";
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawDoctorTeddyBear(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  [
    [-22, -20],
    [22, -20],
  ].forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.arc(ex, ey, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#C99A72";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#7D5432";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = "#F5DEC9";
    ctx.fill();
  });

  ctx.beginPath();
  ctx.ellipse(0, 26, 21, 17, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "#95B3C9";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-7, 14);
  ctx.lineTo(0, 25);
  ctx.lineTo(7, 14);
  ctx.closePath();
  ctx.fillStyle = "#79B4D9";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fillStyle = "#D6A87E";
  ctx.fill();
  ctx.strokeStyle = "#7D5432";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, 6, 11, 8.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#FFF9F0";
  ctx.fill();

  ctx.fillStyle = "#3E2723";
  ctx.beginPath();
  ctx.arc(-9, -3, 3, 0, Math.PI * 2);
  ctx.arc(9, -3, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(-10, -4, 1.1, 0, Math.PI * 2);
  ctx.arc(8, -4, 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, 3.5, 4, 2.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#5D4037";
  ctx.fill();

  ctx.strokeStyle = "#487594";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 20, 12, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(9, 28, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = "#FFE066";
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-14, -33, 28, 13, 5);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "#79B4D9";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.fillStyle = "#FF6B8B";
  ctx.fillRect(-2, -31, 4, 9);
  ctx.fillRect(-4.5, -28.5, 9, 4);

  ctx.restore();
}

function drawCuteBunnyDoctor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  [
    [-10, -28, -0.18],
    [10, -28, 0.18],
  ].forEach(([ex, ey, rot]) => {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#CFA8B4";
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 2, 4.2, 13, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#F9B8C8";
    ctx.fill();
    ctx.restore();
  });

  ctx.beginPath();
  ctx.ellipse(0, 0, 23, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#CFA8B4";
  ctx.stroke();

  ctx.fillStyle = "#FFFDF9";
  ctx.strokeStyle = "#F28B9F";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-11, -25, 22, 10, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#FF6B8B";
  ctx.fillRect(-1.5, -23, 3, 6);
  ctx.fillRect(-3, -21.5, 6, 3);

  ctx.fillStyle = "#3A2E2B";
  ctx.beginPath();
  ctx.arc(-8, -1, 3, 0, Math.PI * 2);
  ctx.arc(8, -1, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(-9, -2, 1.1, 0, Math.PI * 2);
  ctx.arc(7, -2, 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#F08099";
  ctx.beginPath();
  ctx.arc(0, 3, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FF7597";
  ctx.beginPath();
  ctx.arc(-5, 18, 6, 0, Math.PI * 2);
  ctx.arc(5, 18, 6, 0, Math.PI * 2);
  ctx.moveTo(-10.5, 20);
  ctx.lineTo(0, 30);
  ctx.lineTo(10.5, 20);
  ctx.fill();

  ctx.restore();
}

function drawCuteKittyDoctor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#FFF7EB";
  ctx.strokeStyle = "#B0967E";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(-20, -6);
  ctx.lineTo(-18, -28);
  ctx.lineTo(-4, -15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(20, -6);
  ctx.lineTo(18, -28);
  ctx.lineTo(4, -15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#487594";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 21, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -18, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = "#CFE6F7";
  ctx.fill();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#2C3E50";
  ctx.beginPath();
  ctx.arc(-8, -1, 2.8, 0, Math.PI * 2);
  ctx.arc(8, -1, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#B0967E";
  ctx.lineWidth = 1.4;
  [-1, 1].forEach((dir) => {
    ctx.beginPath();
    ctx.moveTo(dir * 13, 2);
    ctx.lineTo(dir * 25, 0);
    ctx.moveTo(dir * 13, 6);
    ctx.lineTo(dir * 25, 7);
    ctx.stroke();
  });

  ctx.fillStyle = "#F08099";
  ctx.beginPath();
  ctx.arc(0, 3, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCutePoodlePuppy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#FFFDF9";
  ctx.strokeStyle = "#C9B39B";
  ctx.lineWidth = 2;

  [
    [-21, 2],
    [21, 2],
  ].forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.ellipse(ex, ey, 9, 15, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#F5E1C8";
    ctx.fill();
    ctx.stroke();
  });

  ctx.fillStyle = "#FFFDF9";
  ctx.beginPath();
  ctx.arc(0, 0, 21, 0, Math.PI * 2);
  ctx.arc(-10, -14, 10, 0, Math.PI * 2);
  ctx.arc(0, -17, 11, 0, Math.PI * 2);
  ctx.arc(10, -14, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3E2723";
  ctx.beginPath();
  ctx.arc(-7.5, -1, 2.8, 0, Math.PI * 2);
  ctx.arc(7.5, -1, 2.8, 0, Math.PI * 2);
  ctx.arc(0, 4, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawHeartStethoscopeIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color = "#5B89A6",
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.strokeStyle = "#8CA6B8";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.arc(-7, -14, 6, Math.PI * 0.8, Math.PI * 1.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(7, -14, 6, Math.PI * 1.1, Math.PI * 2.2);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-12, -11);
  ctx.bezierCurveTo(-22, 4, -8, 18, 0, 24);
  ctx.bezierCurveTo(8, 18, 22, 4, 12, -11);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(14, 14, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFDF9";
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.fillStyle = "#FF7597";
  ctx.beginPath();
  ctx.arc(14, 14, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCuteCapsulePill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot = -0.35,
  colorA = "#FF9EBB",
  colorB = "#FFFDF9",
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  ctx.fillStyle = colorA;
  ctx.beginPath();
  ctx.roundRect(-9, -18, 18, 19, [9, 9, 0, 0]);
  ctx.fill();

  ctx.fillStyle = colorB;
  ctx.beginPath();
  ctx.roundRect(-9, 0, 18, 18, [0, 0, 9, 9]);
  ctx.fill();

  ctx.strokeStyle = "#5B89A6";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-9, -18, 18, 36, 9);
  ctx.stroke();

  ctx.fillStyle = "#283E52";
  ctx.beginPath();
  ctx.arc(-3.5, 5, 1.3, 0, Math.PI * 2);
  ctx.arc(3.5, 5, 1.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 7, 2, 0, Math.PI);
  ctx.stroke();

  ctx.restore();
}

function drawCuteBandAid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot = 0.4,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#FCD5CE";
  ctx.strokeStyle = "#E8998D";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-20, -8, 40, 16, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#FFFDF9";
  ctx.fillRect(-7, -7, 14, 14);

  ctx.fillStyle = "#FF6B8B";
  ctx.beginPath();
  ctx.arc(-2, -1, 2.5, 0, Math.PI * 2);
  ctx.arc(2, -1, 2.5, 0, Math.PI * 2);
  ctx.moveTo(-4.2, 0);
  ctx.lineTo(0, 4.5);
  ctx.lineTo(4.2, 0);
  ctx.fill();

  ctx.restore();
}

function drawCuteSyringeIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot = -0.5,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.strokeStyle = "#5B89A6";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-7, -16, 14, 30, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#FF9EBB";
  ctx.fillRect(-5, -4, 10, 16);

  ctx.strokeStyle = "#5B89A6";
  ctx.lineWidth = 1.2;
  [-10, -4, 2, 8].forEach((ly) => {
    ctx.beginPath();
    ctx.moveTo(-7, ly);
    ctx.lineTo(-2, ly);
    ctx.stroke();
  });

  ctx.fillStyle = "#98CEF0";
  ctx.fillRect(-2.5, -26, 5, 10);
  ctx.fillRect(-8, -28, 16, 3.5);

  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.lineTo(0, 23);
  ctx.stroke();

  ctx.restore();
}

function drawMedicalClipboardIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#E6BA95";
  ctx.strokeStyle = "#B0825E";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-18, -22, 36, 44, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(-14, -16, 28, 34);

  ctx.fillStyle = "#95B3C9";
  ctx.beginPath();
  ctx.roundRect(-8, -25, 16, 6, 2);
  ctx.fill();

  ctx.fillStyle = "#FF6B8B";
  ctx.fillRect(-9, -12, 6, 2);
  ctx.fillRect(-7, -14, 2, 6);

  ctx.fillStyle = "#487594";
  ctx.font = "bold 8px sans-serif";
  ctx.fillText("Rx: 100%", -2, -7);
  ctx.fillText("HAPPY ♥", -11, 5);
  ctx.fillText("HEALTHY", -11, 14);

  ctx.restore();
}

function drawECGHeartbeatLine(
  ctx: CanvasRenderingContext2D,
  startX: number,
  y: number,
  width: number,
  color = "#FF6B8B",
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const mid = startX + width / 2;
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(mid - 28, y);
  ctx.lineTo(mid - 20, y - 6);
  ctx.lineTo(mid - 14, y + 6);
  ctx.lineTo(mid - 6, y - 18);
  ctx.lineTo(mid + 2, y + 14);
  ctx.lineTo(mid + 10, y - 9);
  ctx.lineTo(mid + 18, y);
  ctx.lineTo(startX + width, y);
  ctx.stroke();
  ctx.restore();
}

function drawMiniBirthdayCakeIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#E2EDF5";
  ctx.beginPath();
  ctx.ellipse(0, 18, 26, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFF8EE";
  ctx.strokeStyle = "#D4A373";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-20, -4, 40, 22, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#F497B0";
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.quadraticCurveTo(-12, 10, -6, 1);
  ctx.quadraticCurveTo(0, 11, 7, 1);
  ctx.quadraticCurveTo(14, 10, 20, 0);
  ctx.lineTo(20, -4);
  ctx.lineTo(-20, -4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#E64866";
  ctx.beginPath();
  ctx.arc(-11, -6, 4, 0, Math.PI * 2);
  ctx.arc(11, -6, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#79B4D9";
  ctx.fillRect(-3, -18, 6, 14);
  ctx.fillStyle = "#FFD166";
  ctx.beginPath();
  ctx.ellipse(0, -23, 4.5, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCuteGiftBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  boxColor = "#CFE6F7",
  ribbonColor = "#F28B9F",
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = boxColor;
  ctx.strokeStyle = ribbonColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-16, -10, 32, 26, 4);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-19, -16, 38, 8, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = ribbonColor;
  ctx.fillRect(-4, -16, 8, 32);
  ctx.fillRect(-16, 0, 32, 6);

  ctx.beginPath();
  ctx.ellipse(-8, -20, 8, 4.5, -0.35, 0, Math.PI * 2);
  ctx.ellipse(8, -20, 8, 4.5, 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBalloonCluster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const balloons = [
    { bx: -13, by: -8, c: "#88C4E8" },
    { bx: 11, by: -14, c: "#FFACC7" },
    { bx: 0, by: 3, c: "#FFE28A" },
  ];

  balloons.forEach((b) => {
    ctx.beginPath();
    ctx.moveTo(b.bx, b.by + 14);
    ctx.quadraticCurveTo(0, 26, 0, 40);
    ctx.strokeStyle = "#8DA4B5";
    ctx.lineWidth = 1.3;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(b.bx, b.by, 12.5, 15.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = b.c;
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(b.bx - 4, b.by - 5, 2.8, 5, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fill();
  });

  ctx.restore();
}

function drawCuteSpeechSticker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  bgColor = "#FFFDF9",
  borderColor = "#F28B9F",
) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2.2;

  ctx.beginPath();
  ctx.roundRect(-54, -15, 108, 28, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#283E52";
  ctx.font = "bold 11px 'Be Vietnam Pro', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, 0, 3);

  ctx.restore();
}

// ============================================================================
// HÀM CHÍNH: VẼ PHỤ KIỆN AR 6DoF BÁM CHẶT THEO KHUÔN MẶT + KHUNG PURIKURA TRENDING
// ============================================================================
function drawFilterAccessoryOnCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  filterIndex: number,
  facePose: TrackedFacePose,
) {
  const filter = PHOTOBOOTH_FILTERS[filterIndex % PHOTOBOOTH_FILTERS.length];

  ctx.save();

  ctx.fillStyle = filter.tint;
  ctx.fillRect(0, 0, w, h);

  const fx = facePose.foreheadX;
  const fy = facePose.foreheadY;
  const ex = facePose.eyeCenterX;
  const ey = facePose.eyeCenterY;
  const rcx = facePose.rightCheekX;
  const rcy = facePose.rightCheekY;
  const roll = facePose.rollAngle;
  const yaw = facePose.yawRatio;
  const sc = facePose.faceScale;

  const yawShiftX = yaw * 18 * sc;
  const cosYaw = Math.max(0.75, Math.cos(yaw * 0.65));

  if (filterIndex % 2 === 1) {
    drawCuteBandAid(ctx, rcx + 4 * sc, rcy - 2 * sc, roll - 0.18, 0.54 * sc);
  }

  if (filterIndex === 0) {
    ctx.save();
    ctx.translate(fx + yawShiftX, fy - 8 * sc);
    ctx.rotate(roll);
    ctx.scale(sc * cosYaw, sc);
    ctx.shadowColor = "rgba(212, 175, 106, 0.5)";
    ctx.shadowBlur = 10;

    const crownGrad = ctx.createLinearGradient(-75, -50, 75, 20);
    crownGrad.addColorStop(0, "#E5C178");
    crownGrad.addColorStop(0.5, "#FFF4D4");
    crownGrad.addColorStop(1, "#D1A654");

    ctx.fillStyle = crownGrad;
    ctx.strokeStyle = "#B38736";
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-68, 18);
    ctx.quadraticCurveTo(-62, -18, -44, -26);
    ctx.quadraticCurveTo(-28, 2, -22, -12);
    ctx.quadraticCurveTo(-10, -38, 0, -52);
    ctx.quadraticCurveTo(10, -38, 22, -12);
    ctx.quadraticCurveTo(28, 2, 44, -26);
    ctx.quadraticCurveTo(62, -18, 68, 18);
    ctx.quadraticCurveTo(0, 8, -68, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FF6B8B";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(-4, -20, 5, 0, Math.PI * 2);
    ctx.arc(4, -20, 5, 0, Math.PI * 2);
    ctx.moveTo(-8.5, -18);
    ctx.lineTo(0, -9);
    ctx.lineTo(8.5, -18);
    ctx.fill();

    const pearls = [
      [-52, 12, 3.5],
      [-35, 10, 4],
      [-18, 8, 4],
      [0, 7, 4.5],
      [18, 8, 4],
      [35, 10, 4],
      [52, 12, 3.5],
      [-44, -29, 5],
      [-22, -15, 4],
      [0, -56, 6.5],
      [22, -15, 4],
      [44, -29, 5],
    ];
    pearls.forEach(([px, py, r]) => {
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFDF9";
      ctx.fill();
      ctx.strokeStyle = "#D4AF6A";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
    ctx.restore();
  } else if (filterIndex === 1) {
    ctx.save();
    ctx.translate(fx + yawShiftX, fy - 10 * sc);
    ctx.rotate(roll);
    ctx.scale(sc * cosYaw, sc);
    ctx.shadowColor = "rgba(91, 137, 166, 0.35)";
    ctx.shadowBlur = 10;

    ctx.fillStyle = "#FFFDFB";
    ctx.strokeStyle = "#8BB8D6";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-64, 14);
    ctx.lineTo(-76, -26);
    ctx.quadraticCurveTo(0, -52, 76, -26);
    ctx.lineTo(64, 14);
    ctx.quadraticCurveTo(0, 4, -64, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#5B89A6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-62, 6);
    ctx.quadraticCurveTo(0, -4, 62, 6);
    ctx.stroke();

    ctx.fillStyle = "#FF6B8B";
    ctx.beginPath();
    ctx.roundRect(-5, -30, 10, 26, 3);
    ctx.roundRect(-13, -22, 26, 10, 3);
    ctx.fill();

    drawCornerSatinBow(ctx, -64, 12, "#98CEF0", "#FFFFFF", 0.62);
    drawCornerSatinBow(ctx, 64, 12, "#98CEF0", "#FFFFFF", 0.62);
    ctx.restore();
  } else if (filterIndex === 2) {
    ctx.save();
    ctx.translate(fx + yawShiftX, fy - 6 * sc);
    ctx.rotate(roll);
    ctx.scale(sc * cosYaw, sc);

    ctx.strokeStyle = "#FFFDF9";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 38, 72, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();

    ctx.save();
    ctx.translate(-42, -16);
    ctx.rotate(-0.18);
    ctx.shadowColor = "rgba(180, 140, 155, 0.35)";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.ellipse(0, 0, 21, 52, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFDFB";
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#E6D2D8";
    ctx.stroke();

    const innerEarL = ctx.createLinearGradient(0, -35, 0, 35);
    innerEarL.addColorStop(0, "#F9D5DF");
    innerEarL.addColorStop(1, "#F2A7B8");
    ctx.beginPath();
    ctx.ellipse(0, 5, 11, 36, 0, 0, Math.PI * 2);
    ctx.fillStyle = innerEarL;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(42, -12);
    ctx.rotate(0.26);
    ctx.shadowColor = "rgba(180, 140, 155, 0.35)";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.ellipse(0, 0, 21, 50, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFDFB";
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#E6D2D8";
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 5, 11, 34, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#F4B5C4";
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#F28B9F";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-24, -16, 48, 24, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FF6B8B";
    ctx.fillRect(-3, -11, 6, 14);
    ctx.fillRect(-7, -7, 14, 6);
    ctx.restore();
  } else if (filterIndex === 3) {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(roll);
    ctx.scale(sc * cosYaw, sc);

    [-44, 44].forEach((gx) => {
      ctx.fillStyle = "rgba(255, 252, 245, 0.12)";
      ctx.beginPath();
      ctx.arc(gx, 0, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#D4AF6A";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(gx, 0, 30, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(gx - 18, -16);
      ctx.lineTo(gx - 6, -24);
      ctx.stroke();
    });

    ctx.strokeStyle = "#D4AF6A";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.quadraticCurveTo(0, -10, 14, -2);
    ctx.stroke();

    [-1, 1].forEach((dir) => {
      const startX = dir * 74;
      for (let i = 0; i < 8; i++) {
        const py = 4 + i * 9;
        const px = startX + Math.sin(i * 0.5) * dir * 3;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFDF9";
        ctx.fill();
        ctx.strokeStyle = "#D4AF6A";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    ctx.restore();
  } else if (filterIndex === 4) {
    ctx.save();
    ctx.translate(fx + yawShiftX, fy - 8 * sc);
    ctx.rotate(roll);
    ctx.scale(sc * cosYaw, sc);

    ctx.strokeStyle = "rgba(255, 248, 214, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 6, 92, 28, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();

    drawECGHeartbeatLine(ctx, -55, -24, 110, "#FF6B8B");

    const starPositions = [
      [-84, 10, 9],
      [-56, -10, 12],
      [56, -10, 12],
      [84, 10, 9],
    ];
    starPositions.forEach(([sx, sy, sr]) => {
      ctx.fillStyle = "#FFF8D6";
      ctx.strokeStyle = "#E5C178";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy - sr);
      ctx.quadraticCurveTo(sx, sy, sx + sr, sy);
      ctx.quadraticCurveTo(sx, sy, sx, sy + sr);
      ctx.quadraticCurveTo(sx, sy, sx - sr, sy);
      ctx.quadraticCurveTo(sx, sy, sx, sy - sr);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  } else if (filterIndex === 5) {
    ctx.save();
    ctx.translate(fx + yawShiftX, fy - 4 * sc);
    ctx.rotate(roll);
    ctx.scale(sc * cosYaw, sc);

    ctx.strokeStyle = "#7BA675";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 46, 86, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();

    const daisyNodes = [
      [-72, 12, 0.85],
      [-48, -2, 1],
      [-24, -10, 0.9],
      [0, -13, 1.15],
      [24, -10, 0.9],
      [48, -2, 1],
      [72, 12, 0.85],
    ];

    daisyNodes.forEach(([dx, dy]) => {
      ctx.fillStyle = "#8BB884";
      ctx.beginPath();
      ctx.ellipse(dx - 10, dy + 5, 8, 4, -0.5, 0, Math.PI * 2);
      ctx.ellipse(dx + 10, dy + 5, 8, 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    daisyNodes.forEach(([dx, dy, dsc]) => {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.scale(dsc, dsc);
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        ctx.save();
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, -8, 4.2, 7.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.strokeStyle = "#E6E2D6";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
      ctx.fillStyle = "#F4C44E";
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  } else if (filterIndex === 6) {
    ctx.save();
    ctx.translate(fx + yawShiftX, fy);
    ctx.rotate(roll);
    ctx.scale(sc * cosYaw, sc);

    [
      { x: -76, y: 4, rot: -0.22 },
      { x: 76, y: 4, rot: 0.22 },
    ].forEach((bow) => {
      ctx.save();
      ctx.translate(bow.x, bow.y);
      ctx.rotate(bow.rot);

      ctx.fillStyle = "#7AB5DB";
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(-4, 4);
      ctx.quadraticCurveTo(-18, 28, -24, 48);
      ctx.lineTo(-10, 44);
      ctx.quadraticCurveTo(-6, 24, 2, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(4, 4);
      ctx.quadraticCurveTo(18, 28, 24, 48);
      ctx.lineTo(10, 44);
      ctx.quadraticCurveTo(6, 24, -2, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-16, -2, 16, 10, -0.25, 0, Math.PI * 2);
      ctx.ellipse(16, -2, 16, 10, 0.25, 0, Math.PI * 2);
      ctx.fillStyle = "#9ED0F0";
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -1, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFDF9";
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  } else if (filterIndex === 7) {
    ctx.save();
    ctx.translate(fx + yawShiftX + 6 * sc, fy - 6 * sc);
    ctx.rotate(roll + 0.1);
    ctx.scale(sc * cosYaw, sc);

    for (let i = -38; i <= 38; i += 11) {
      ctx.beginPath();
      ctx.arc(i, 24, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFDF9";
      ctx.fill();
      ctx.strokeStyle = "#8BB8D6";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(-42, 24);
    ctx.lineTo(0, -64);
    ctx.lineTo(42, 24);
    ctx.closePath();
    ctx.fillStyle = "#98CEF0";
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const pomPoms: Array<[number, number, number, string]> = [
      [0, -68, 13, "#FFFDF9"],
      [-5, -65, 8, "#F7C6D0"],
      [6, -65, 8, "#88C4E8"],
      [0, -71, 8, "#FFFDF9"],
    ];
    pomPoms.forEach(([bx, by, br, bc]) => {
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = bc;
      ctx.fill();
    });
    ctx.restore();
  }

  const borderT = 32;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.roundRect(borderT, borderT, w - borderT * 2, h - borderT * 2, 28);
  ctx.clip("evenodd");

  const frameGrad = ctx.createLinearGradient(0, 0, w, h);
  frameGrad.addColorStop(0, filter.framePrimary);
  frameGrad.addColorStop(0.5, "#FFFDF9");
  frameGrad.addColorStop(1, filter.frameSecondary);
  ctx.fillStyle = frameGrad;
  ctx.fillRect(0, 0, w, h);

  if (
    filter.patternType === "COQUETTE_PEARL" ||
    filter.patternType === "CANDY_STRIPE"
  ) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
    ctx.lineWidth = 12;
    for (let i = -h; i < w + h; i += 24) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
    }
  } else if (
    filter.patternType === "MEDICAL_CHART" ||
    filter.patternType === "Y2K_WINDOW"
  ) {
    ctx.strokeStyle = "rgba(91, 137, 166, 0.18)";
    ctx.lineWidth = 1.2;
    for (let x = 0; x < w; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (
    filter.patternType === "GINGHAM_LACE" ||
    filter.patternType === "BOTANICAL_DIARY"
  ) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    for (let x = 0; x < w; x += 26) {
      ctx.fillRect(x, 0, 13, h);
    }
    for (let y = 0; y < h; y += 26) {
      ctx.fillRect(0, y, w, 13);
    }
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    for (let x = 14; x < w; x += 26) {
      for (let y = 14; y < h; y += 26) {
        ctx.beginPath();
        ctx.arc(x + ((y / 26) % 2 === 0 ? 0 : 11), y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#FFFDF9";
  ctx.strokeStyle = filter.accentColor;
  ctx.lineWidth = 1.6;

  for (let x = borderT + 14; x <= w - borderT - 14; x += 20) {
    [borderT, h - borderT].forEach((ly) => {
      ctx.beginPath();
      ctx.arc(x, ly, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, ly, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = filter.accentColor;
      ctx.fill();
      ctx.fillStyle = "#FFFDF9";
    });
  }

  for (let y = borderT + 14; y <= h - borderT - 14; y += 20) {
    [borderT, w - borderT].forEach((lx) => {
      ctx.beginPath();
      ctx.arc(lx, y, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(lx, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = filter.accentColor;
      ctx.fill();
      ctx.fillStyle = "#FFFDF9";
    });
  }

  ctx.beginPath();
  ctx.roundRect(borderT, borderT, w - borderT * 2, h - borderT * 2, 28);
  ctx.strokeStyle = filter.accentColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 16);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(255, 253, 249, 0.92)";
  ctx.strokeStyle = filter.accentColor;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(w / 2 - 115, 7, 230, 18, 9);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#283E52";
  ctx.font = "bold 9px 'Be Vietnam Pro', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`● REC  |  BIRTHDAY STUDIO  |  19.09 ♥ 15.10`, w / 2, 19);
  ctx.restore();

  const flagColors = [
    "#88C4E8",
    "#FFACC7",
    "#FFE28A",
    "#B8E6C8",
    "#D9B8F7",
    "#FFB899",
  ];
  const numFlags = 13;
  const startX = 42;
  const endX = w - 42;
  const stepW = (endX - startX) / numFlags;

  for (let i = 0; i < numFlags; i++) {
    const fx1 = startX + i * stepW;
    const fx2 = fx1 + stepW;
    const fmid = (fx1 + fx2) / 2;
    const sag = Math.sin((i / numFlags) * Math.PI) * 10;

    ctx.beginPath();
    ctx.moveTo(fx1, 26 + sag);
    ctx.lineTo(fx2, 26 + sag);
    ctx.lineTo(fmid, 50 + sag);
    ctx.closePath();
    ctx.fillStyle = flagColors[i % flagColors.length];
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  drawCornerSatinBow(ctx, 36, 36, "#F497B0", "#FFFFFF", 0.9);
  drawCornerSatinBow(ctx, w - 36, 36, "#79B4D9", "#FFFFFF", 0.9);
  drawCornerSatinBow(ctx, 34, h - 108, "#79B4D9", "#FFFFFF", 0.78);
  drawCornerSatinBow(ctx, w - 34, h - 108, "#F497B0", "#FFFFFF", 0.78);

  drawBalloonCluster(ctx, 44, 114, 0.82);
  drawBalloonCluster(ctx, w - 44, 114, 0.82);

  drawHeartStethoscopeIcon(ctx, 40, 208, "#487594", 0.92);
  drawMedicalClipboardIcon(ctx, w - 40, 208, 0.88);

  drawCuteCapsulePill(ctx, 38, 285, -0.35, "#FF9EBB", "#FFFDF9", 0.88);
  drawCuteSyringeIcon(ctx, w - 38, 285, 0.4, 0.88);

  drawCuteBandAid(ctx, 44, 348, 0.35, 0.78);
  drawCuteCapsulePill(ctx, w - 40, 348, 0.4, "#88C4E8", "#FFFDF9", 0.82);

  drawCuteSpeechSticker(
    ctx,
    114,
    70,
    filter.stickerText,
    "#FFFDF9",
    filter.accentColor,
  );
  drawCuteSpeechSticker(
    ctx,
    w - 110,
    70,
    "Happy B-Day! 🩺",
    "#FFFDF9",
    "#79B4D9",
  );

  if (filterIndex % 4 === 0) {
    drawDoctorTeddyBear(ctx, 68, h - 56, 0.94);
    drawCuteBunnyDoctor(ctx, w - 68, h - 52, 0.96);
  } else if (filterIndex % 4 === 1) {
    drawCuteBunnyDoctor(ctx, 66, h - 52, 0.96);
    drawCuteKittyDoctor(ctx, w - 68, h - 52, 0.96);
  } else if (filterIndex % 4 === 2) {
    drawCutePoodlePuppy(ctx, 66, h - 52, 0.96);
    drawDoctorTeddyBear(ctx, w - 68, h - 56, 0.94);
  } else {
    drawCuteKittyDoctor(ctx, 66, h - 52, 0.96);
    drawDoctorTeddyBear(ctx, w - 68, h - 56, 0.94);
  }

  drawMiniBirthdayCakeIcon(ctx, 128, h - 42, 0.88);
  drawCuteGiftBox(ctx, w - 128, h - 40, "#CFE6F7", "#F28B9F", 0.88);

  const bannerW = 308;
  const bannerH = 38;
  const bx = (w - bannerW) / 2;
  const by = h - 50;

  ctx.fillStyle = filter.accentColor;
  ctx.beginPath();
  ctx.moveTo(bx - 16, by + 10);
  ctx.lineTo(bx + 6, by + 6);
  ctx.lineTo(bx + 6, by + 32);
  ctx.lineTo(bx - 16, by + 34);
  ctx.lineTo(bx - 8, by + 22);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(bx + bannerW + 16, by + 10);
  ctx.lineTo(bx + bannerW - 6, by + 6);
  ctx.lineTo(bx + bannerW - 6, by + 32);
  ctx.lineTo(bx + bannerW + 16, by + 34);
  ctx.lineTo(bx + bannerW + 8, by + 22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#FFFDF9";
  ctx.strokeStyle = filter.accentColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, bannerW, bannerH, 19);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#F7C6D0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx + 4, by + 4, bannerW - 8, bannerH - 8, 15);
  ctx.stroke();

  ctx.fillStyle = "#283E52";
  ctx.font = "bold 13px 'Be Vietnam Pro', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`🎂 HAPPY BIRTHDAY • 🩺💖✨`, w / 2, by + 24);

  ctx.restore();
}

interface CapturedPhoto {
  id: number;
  dataUrl: string;
  filterName: string;
}

interface VisionLandmark {
  x: number;
  y: number;
  z: number;
}

interface VisionFaceLandmarker {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number,
  ) => { faceLandmarks?: VisionLandmark[][] };
  close?: () => void;
}

function PhotoboothPage({ onBackToCake }: { onBackToCake: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [activeFilterIdx, setActiveFilterIdx] = useState(0);
  const [faceDetectedStatus, setFaceDetectedStatus] = useState(false);

  const [sessionState, setSessionState] = useState<
    "IDLE" | "SHOOTING" | "SELECTING"
  >("IDLE");
  const [currentShotIdx, setCurrentShotIdx] = useState(0);
  const [countdown, setCountdown] = useState(8);
  const [flashEffect, setFlashEffect] = useState(false);

  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [uploadStatus, setUploadStatus] = useState<
    "IDLE" | "UPLOADING" | "DONE"
  >("IDLE");

  const targetFacePoseRef = useRef<TrackedFacePose>({
    detected: false,
    foreheadX: 320,
    foreheadY: 112,
    eyeCenterX: 320,
    eyeCenterY: 205,
    leftCheekX: 252,
    leftCheekY: 252,
    rightCheekX: 388,
    rightCheekY: 252,
    chinX: 320,
    chinY: 318,
    rollAngle: 0,
    yawRatio: 0,
    pitchRatio: 0,
    faceScale: 1,
  });

  const smoothFacePoseRef = useRef<TrackedFacePose>({
    ...targetFacePoseRef.current,
  });

  useEffect(() => {
    let isCancelled = false;
    let faceLandmarker: VisionFaceLandmarker | null = null;
    let detectTimer: ReturnType<typeof setTimeout> | null = null;
    let lastVideoTime = -1;

    const skinCanvas = document.createElement("canvas");
    skinCanvas.width = 80;
    skinCanvas.height = 60;
    const skinCtx = skinCanvas.getContext("2d", { willReadFrequently: true });

    const updatePoseFrom478Landmarks = (landmarks: VisionLandmark[]) => {
      const w = 640;
      const h = 480;
      const pt = (idx: number) => ({
        x: (1 - landmarks[idx].x) * w,
        y: landmarks[idx].y * h,
        z: landmarks[idx].z,
      });

      const forehead = pt(10);
      const noseBridge = pt(168);
      const noseTip = pt(1);
      const leftEyeOuter = pt(263);
      const rightEyeOuter = pt(33);
      const leftCheek = pt(454);
      const rightCheek = pt(234);
      const chin = pt(152);

      const dx = rightEyeOuter.x - leftEyeOuter.x;
      const dy = rightEyeOuter.y - leftEyeOuter.y;
      const eyeDist = Math.hypot(dx, dy);
      const rollAngle = Math.atan2(dy, dx);
      const faceScale = Math.max(0.65, Math.min(1.75, eyeDist / 106));

      const midEyeX = (leftEyeOuter.x + rightEyeOuter.x) * 0.5;
      const yawRatio = Math.max(
        -1,
        Math.min(1, (noseTip.x - midEyeX) / (eyeDist * 0.55)),
      );
      const faceH = Math.max(1, chin.y - forehead.y);
      const pitchRatio = Math.max(
        -1,
        Math.min(1, (noseTip.y - forehead.y) / faceH - 0.58),
      );

      const upX = Math.sin(rollAngle);
      const upY = -Math.cos(rollAngle);

      targetFacePoseRef.current = {
        detected: true,
        foreheadX: forehead.x + upX * (16 * faceScale),
        foreheadY: forehead.y + upY * (16 * faceScale),
        eyeCenterX: noseBridge.x,
        eyeCenterY: noseBridge.y,
        leftCheekX: leftCheek.x * 0.55 + noseBridge.x * 0.45,
        leftCheekY: leftCheek.y + 4 * faceScale,
        rightCheekX: rightCheek.x * 0.55 + noseBridge.x * 0.45,
        rightCheekY: rightCheek.y + 4 * faceScale,
        chinX: chin.x,
        chinY: chin.y,
        rollAngle,
        yawRatio,
        pitchRatio,
        faceScale,
      };
      setFaceDetectedStatus(true);
    };

    const runSkinMomentFallback = (video: HTMLVideoElement) => {
      if (!skinCtx) return;
      const sw = 80;
      const sh = 60;
      skinCtx.save();
      skinCtx.translate(sw, 0);
      skinCtx.scale(-1, 1);
      skinCtx.drawImage(video, 0, 0, sw, sh);
      skinCtx.restore();

      const imgData = skinCtx.getImageData(0, 0, sw, sh).data;
      let m00 = 0;
      let m10 = 0;
      let m01 = 0;
      let m11 = 0;
      let m20 = 0;
      let m02 = 0;

      for (let y = 6; y < sh - 6; y++) {
        for (let x = 8; x < sw - 8; x++) {
          const i = (y * sw + x) * 4;
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];

          const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

          if (
            cr >= 134 &&
            cr <= 175 &&
            cb >= 76 &&
            cb <= 128 &&
            r > 65 &&
            r > g &&
            r > b
          ) {
            m00 += 1;
            m10 += x;
            m01 += y;
            m11 += x * y;
            m20 += x * x;
            m02 += y * y;
          }
        }
      }

      if (m00 > 42) {
        const cx = (m10 / m00 / sw) * 640;
        const cy = (m01 / m00 / sh) * 480;

        const u20 = m20 / m00 - (m10 / m00) ** 2;
        const u02 = m02 / m00 - (m01 / m00) ** 2;
        const u11 = m11 / m00 - (m10 / m00) * (m01 / m00);
        const rawTilt = 0.5 * Math.atan2(2 * u11, u20 - u02);
        const rollAngle = Math.max(-0.45, Math.min(0.45, rawTilt * 0.35));

        const estScale = Math.max(0.75, Math.min(1.45, Math.sqrt(m00 / 480)));
        const upX = Math.sin(rollAngle);
        const upY = -Math.cos(rollAngle);

        targetFacePoseRef.current = {
          detected: true,
          foreheadX: cx + upX * (82 * estScale),
          foreheadY: cy + upY * (82 * estScale),
          eyeCenterX: cx + upX * (18 * estScale),
          eyeCenterY: cy + upY * (18 * estScale),
          leftCheekX: cx - 56 * estScale,
          leftCheekY: cy + 16 * estScale,
          rightCheekX: cx + 56 * estScale,
          rightCheekY: cy + 16 * estScale,
          chinX: cx - upX * (78 * estScale),
          chinY: cy - upY * (78 * estScale),
          rollAngle,
          yawRatio: 0,
          pitchRatio: 0,
          faceScale: estScale,
        };
        setFaceDetectedStatus(true);
      }
    };

    const runTrackingCycle = () => {
      if (isCancelled) return;
      const video = videoRef.current;

      if (video && video.readyState >= 2 && !video.paused) {
        if (faceLandmarker) {
          try {
            const nowMs = performance.now();
            if (video.currentTime !== lastVideoTime) {
              lastVideoTime = video.currentTime;
              const res = faceLandmarker.detectForVideo(video, nowMs);
              if (res.faceLandmarks && res.faceLandmarks.length > 0) {
                updatePoseFrom478Landmarks(res.faceLandmarks[0]);
              } else {
                runSkinMomentFallback(video);
              }
            }
          } catch {
            runSkinMomentFallback(video);
          }
        } else {
          runSkinMomentFallback(video);
        }
      }

      detectTimer = setTimeout(runTrackingCycle, 33);
    };

    runTrackingCycle();

    const loadTasksVisionAI = async () => {
      try {
        const visionModuleUrl =
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm";
        const vision = await import(/* @vite-ignore */ visionModuleUrl);
        if (isCancelled) return;

        const filesetResolver = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
        );
        if (isCancelled) return;

        faceLandmarker = await vision.FaceLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
          },
        );
      } catch {
        // Fallback tracker tetap chạy mượt
      }
    };

    loadTasksVisionAI();

    return () => {
      isCancelled = true;
      if (detectTimer) clearTimeout(detectTimer);
      if (faceLandmarker && faceLandmarker.close) {
        try {
          faceLandmarker.close();
        } catch {
          // Ignore close error
        }
      }
    };
  }, []);

  const connectCameraStream = useCallback(() => {
    const hasActiveTracks =
      streamRef.current &&
      streamRef.current.getVideoTracks().some((t) => t.readyState === "live");

    if (hasActiveTracks && streamRef.current) {
      if (videoRef.current) {
        if (videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
        videoRef.current.play().catch(() => {
          // Ignore play interruption
        });
      }
      Promise.resolve().then(() => {
        setCameraError("");
        setCameraReady(true);
      });
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {
            // Ignore play interruption
          });
        }
        setCameraError("");
        setCameraReady(true);
      })
      .catch(() => {
        setCameraError(
          "Không tìm thấy hoặc chưa cấp quyền Camera. Hệ thống đã bật Chế độ Giả lập Studio để bạn vẫn trải nghiệm chụp đủ 8 tấm ảnh!",
        );
        setCameraReady(true);
      });
  }, []);

  useEffect(() => {
    connectCameraStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [connectCameraStream]);

  useEffect(() => {
    let animId: number;
    const adaptiveLerp = (
      curVal: number,
      targetVal: number,
      baseAlpha = 0.35,
    ) => {
      const delta = Math.abs(targetVal - curVal);
      const dynamicAlpha = Math.min(0.78, baseAlpha + delta * 0.015);
      return curVal + (targetVal - curVal) * dynamicAlpha;
    };

    const renderLoop = () => {
      const canvas = previewCanvasRef.current;
      const video = videoRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          const filterObj =
            PHOTOBOOTH_FILTERS[activeFilterIdx % PHOTOBOOTH_FILTERS.length];

          const target = targetFacePoseRef.current;
          const cur = smoothFacePoseRef.current;

          cur.detected = target.detected;
          cur.foreheadX = adaptiveLerp(cur.foreheadX, target.foreheadX);
          cur.foreheadY = adaptiveLerp(cur.foreheadY, target.foreheadY);
          cur.eyeCenterX = adaptiveLerp(cur.eyeCenterX, target.eyeCenterX);
          cur.eyeCenterY = adaptiveLerp(cur.eyeCenterY, target.eyeCenterY);
          cur.leftCheekX = adaptiveLerp(cur.leftCheekX, target.leftCheekX);
          cur.leftCheekY = adaptiveLerp(cur.leftCheekY, target.leftCheekY);
          cur.rightCheekX = adaptiveLerp(cur.rightCheekX, target.rightCheekX);
          cur.rightCheekY = adaptiveLerp(cur.rightCheekY, target.rightCheekY);
          cur.chinX = adaptiveLerp(cur.chinX, target.chinX);
          cur.chinY = adaptiveLerp(cur.chinY, target.chinY);
          cur.rollAngle = adaptiveLerp(cur.rollAngle, target.rollAngle, 0.32);
          cur.yawRatio = adaptiveLerp(cur.yawRatio, target.yawRatio, 0.3);
          cur.pitchRatio = adaptiveLerp(cur.pitchRatio, target.pitchRatio, 0.3);
          cur.faceScale = adaptiveLerp(cur.faceScale, target.faceScale, 0.3);

          ctx.clearRect(0, 0, w, h);

          if (video && video.readyState >= 2 && !cameraError) {
            ctx.save();
            ctx.filter = filterObj.cssFilter;
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, w, h);
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.globalCompositeOperation = "soft-light";
            ctx.filter = "blur(4px) brightness(1.06)";
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, w, h);

            ctx.globalAlpha = 0.14;
            ctx.globalCompositeOperation = "screen";
            ctx.filter = "blur(2.5px)";
            ctx.drawImage(video, 0, 0, w, h);
            ctx.restore();
          } else {
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, "#DCECF7");
            grad.addColorStop(1, "#F7F2E7");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = "#487594";
            ctx.font = "600 15px 'Be Vietnam Pro', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("📸 Khung Hình Studio Sinh Nhật", w / 2, h * 0.49 + 5);
          }

          drawFilterAccessoryOnCanvas(ctx, w, h, activeFilterIdx, cur);
        }
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [activeFilterIdx, cameraError, sessionState]);

  useEffect(() => {
    if (sessionState !== "SHOOTING") return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL("image/png");

        setFlashEffect(true);
        setTimeout(() => setFlashEffect(false), 260);

        setCapturedPhotos((prev) => {
          const next = [
            ...prev,
            {
              id: currentShotIdx,
              dataUrl,
              filterName: `Frame_${currentShotIdx + 1}`,
            },
          ];

          if (next.length >= 8) {
            setSessionState("SELECTING");
            setSelectedIndices([0, 1, 2, 3]);
            setUploadStatus("UPLOADING");
            sendToGoogleOrWebhook({
              type: "PHOTOBOOTH_8_PHOTOS",
              timestamp: new Date().toISOString(),
              photos: next,
            }).then(() => {
              setUploadStatus("DONE");
            });
          } else {
            const nextIdx = currentShotIdx + 1;
            setCurrentShotIdx(nextIdx);
            setActiveFilterIdx(nextIdx);
            setCountdown(8);
          }
          return next;
        });
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [sessionState, countdown, currentShotIdx]);

  const handleStart8Shots = () => {
    setCapturedPhotos([]);
    setSelectedIndices([]);
    setUploadStatus("IDLE");
    setCurrentShotIdx(0);
    setActiveFilterIdx(0);
    setCountdown(8);
    setSessionState("SHOOTING");
  };

  const handleReturnToPrepareScreen = () => {
    setCapturedPhotos([]);
    setSelectedIndices([]);
    setUploadStatus("IDLE");
    setCurrentShotIdx(0);
    setActiveFilterIdx(0);
    setCountdown(8);
    setSessionState("IDLE");
    connectCameraStream();
  };

  const toggleSelectPhoto = (idx: number) => {
    setSelectedIndices((prev) => {
      if (prev.includes(idx)) {
        return prev.filter((i) => i !== idx);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, idx];
    });
  };

  const handleDownloadPhotostrip = async () => {
    if (selectedIndices.length !== 4) return;
    const stripCanvas = document.createElement("canvas");
    const photoW = 480;
    const photoH = 360;
    const pad = 40;
    const gap = 24;
    const footerH = 155;

    stripCanvas.width = photoW + pad * 2;
    stripCanvas.height = pad + photoH * 4 + gap * 3 + footerH;
    const ctx = stripCanvas.getContext("2d");
    if (!ctx) return;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, stripCanvas.height);
    bgGrad.addColorStop(0, "#FCE8EE");
    bgGrad.addColorStop(0.5, "#E2F1FA");
    bgGrad.addColorStop(1, "#FFF4DA");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, stripCanvas.width, stripCanvas.height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    for (let x = 20; x < stripCanvas.width; x += 36) {
      for (let y = 20; y < stripCanvas.height; y += 36) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = "#79B4D9";
    ctx.lineWidth = 5;
    ctx.strokeRect(12, 12, stripCanvas.width - 24, stripCanvas.height - 24);

    for (let i = 0; i < 4; i++) {
      const photoObj = capturedPhotos[selectedIndices[i]];
      if (!photoObj) continue;
      const img = new Image();
      img.src = photoObj.dataUrl;
      await new Promise<void>((res) => {
        img.onload = () => res();
        img.onerror = () => res();
      });
      const yPos = pad + i * (photoH + gap);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(pad - 6, yPos - 6, photoW + 12, photoH + 12);
      ctx.drawImage(img, pad, yPos, photoW, photoH);
    }

    drawDoctorTeddyBear(ctx, 82, stripCanvas.height - 68, 0.92);
    drawCuteBunnyDoctor(
      ctx,
      stripCanvas.width - 82,
      stripCanvas.height - 64,
      0.95,
    );
    drawECGHeartbeatLine(
      ctx,
      stripCanvas.width / 2 - 90,
      stripCanvas.height - 105,
      180,
      "#FF6B8B",
    );

    ctx.fillStyle = "#283E52";
    ctx.font = "bold 22px 'Lora', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "✦ HAPPY BIRTHDAY DOCTOR ✦",
      stripCanvas.width / 2,
      stripCanvas.height - 66,
    );

    ctx.fillStyle = "#487594";
    ctx.font = "600 14px 'Be Vietnam Pro', sans-serif";
    ctx.fillText(
      `🩺 Kỷ niệm ngọt ngào • ${new Date().toLocaleDateString("vi-VN")} 💊`,
      stripCanvas.width / 2,
      stripCanvas.height - 36,
    );

    const link = document.createElement("a");
    link.download = `Birthday_Photobooth_${Date.now()}.png`;
    link.href = stripCanvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="min-h-[100dvh] py-5 sm:py-8 px-3.5 sm:px-4 pb-24 relative z-20">
      <video ref={videoRef} playsInline muted autoPlay className="hidden" />

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6 bg-[#FAF8F2]/90 backdrop-blur-md border border-[#D8E5EE] px-4 sm:px-6 py-3.5 sm:py-4 rounded-3xl shadow-sm">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={onBackToCake}
              className="px-3.5 py-2 rounded-xl bg-[#EAF1F6] hover:bg-[#D6E5F0] text-[#283E52] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>← Bánh Kem 3D</span>
            </button>
            <div>
              <h1 className="font-serif-vn text-lg sm:text-2xl font-bold text-[#283E52]">
                Tiệm Photobooth Sinh Nhật AR 📸🩺
              </h1>
              <p className="text-[11px] sm:text-xs text-[#546E82]">
                Làm mịn da tự nhiên & Nhận diện khuôn mặt 3D AR tự động bám
                Filter
              </p>
            </div>
          </div>

          {sessionState === "SELECTING" && (
            <button
              onClick={handleReturnToPrepareScreen}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#5B89A6] hover:bg-[#487594] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              🔄 Chụp lại bộ 8 ảnh mới
            </button>
          )}
        </div>

        {sessionState !== "SELECTING" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
            <div className="lg:col-span-2 bg-[#FAF8F2]/95 border border-[#D8E5EE] rounded-3xl p-4 sm:p-5 shadow-md flex flex-col items-center">
              <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-xs font-semibold text-[#487594] bg-[#E6F0F7] px-3 py-1 rounded-full">
                    Khung #{activeFilterIdx + 1}{" "}
                    {PHOTOBOOTH_FILTERS[activeFilterIdx].icon}
                  </span>
                  <span
                    className={`text-[10px] sm:text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${
                      faceDetectedStatus
                        ? "bg-[#EBF7EE] text-[#256B3E] border-[#B7DFC2]"
                        : "bg-[#F4F1EA] text-[#6E7F8D] border-[#D8E0E6]"
                    }`}
                  >
                    {faceDetectedStatus
                      ? "🎯 Đã khóa khuôn mặt AR"
                      : "✨ Đang khởi tạo AR..."}
                  </span>
                </div>

                {sessionState === "SHOOTING" && (
                  <span className="text-xs font-bold text-[#283E52] bg-[#F2ECE1] px-3 py-1 rounded-full border border-[#DEC89E]">
                    Tấm {currentShotIdx + 1} / 8
                  </span>
                )}
              </div>

              <div className="relative w-full max-w-[540px] aspect-[4/3] rounded-2xl overflow-hidden border-2 sm:border-4 border-white shadow-inner bg-[#E6F0F7]">
                <canvas
                  ref={previewCanvasRef}
                  width={640}
                  height={480}
                  className="w-full h-full object-cover block"
                />

                {sessionState === "SHOOTING" && (
                  <div className="absolute top-4 right-4 sm:top-9 sm:right-9 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#283E52]/85 backdrop-blur-md text-white flex flex-col items-center justify-center shadow-lg border-2 border-white/70">
                    <span className="text-base sm:text-xl font-bold leading-none">
                      {countdown}s
                    </span>
                    <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-85">
                      {currentShotIdx + 1}/8
                    </span>
                  </div>
                )}

                {flashEffect && (
                  <div className="absolute inset-0 bg-white animate-fadeIn pointer-events-none" />
                )}
              </div>

              {cameraError && (
                <p className="text-[11px] text-[#647F94] mt-2 text-center">
                  {cameraError}
                </p>
              )}

              <div className="mt-4 sm:mt-5 w-full flex flex-col items-center">
                {sessionState === "IDLE" ? (
                  <button
                    type="button"
                    disabled={!cameraReady}
                    onClick={handleStart8Shots}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-[#5B89A6] hover:bg-[#487594] text-white font-semibold text-xs sm:text-sm shadow-[0_10px_25px_rgba(91,137,166,0.35)] hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>📸 Bắt đầu chụp 8 bức ảnh (8 giây / tấm)</span>
                  </button>
                ) : (
                  <div className="w-full max-w-md text-center">
                    <p className="text-xs font-semibold text-[#487594] mb-2">
                      ✨ Hãy thoải mái nghiêng đầu tạo dáng, Filter tự động bám
                      theo khuôn mặt bạn!
                    </p>
                    <div className="grid grid-cols-8 gap-1.5">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 rounded-full transition-all ${
                            i < capturedPhotos.length
                              ? "bg-[#5B89A6]"
                              : i === currentShotIdx
                                ? "bg-[#93BCD6] animate-pulse"
                                : "bg-[#E2ECF2]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#FAF8F2]/95 border border-[#D8E5EE] rounded-3xl p-4 sm:p-5 shadow-md">
              <h3 className="font-serif-vn text-base font-bold text-[#283E52] mb-1">
                Chọn Thử 8 Khung Ảnh 🩺🎂
              </h3>
              <p className="text-xs text-[#546E82] mb-3.5 sm:mb-4">
                {sessionState === "IDLE"
                  ? "Chạm vào từng ô bên dưới để thử hiệu ứng AR bám theo khuôn mặt:"
                  : "Hệ thống đang tự động chuyển lần lượt qua 8 khung:"}
              </p>

              <div className="grid grid-cols-4 gap-2 sm:gap-2.5 mb-5">
                {PHOTOBOOTH_FILTERS.map((f, idx) => (
                  <button
                    key={f.id}
                    type="button"
                    disabled={sessionState === "SHOOTING"}
                    onClick={() => setActiveFilterIdx(idx)}
                    className={`py-2.5 sm:py-3 px-2 rounded-2xl text-center border transition-all flex flex-col items-center justify-center gap-1 ${
                      activeFilterIdx === idx
                        ? "bg-[#5B89A6] text-white border-[#5B89A6] font-bold shadow-sm scale-105"
                        : "bg-white text-[#334B5E] border-[#D8E5EE] hover:border-[#7BA7C4] cursor-pointer"
                    }`}
                  >
                    <span className="text-base sm:text-lg leading-none">
                      {f.icon}
                    </span>
                    <span className="text-[10px] sm:text-[11px]">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>

              {capturedPhotos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#487594] mb-2">
                    Ảnh vừa chụp ({capturedPhotos.length}/8):
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {capturedPhotos.map((p) => (
                      <img
                        key={p.id}
                        src={p.dataUrl}
                        alt={`Shot ${p.id + 1}`}
                        className="w-full aspect-[4/3] object-cover rounded-lg border border-[#C8DCEB]"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {sessionState === "SELECTING" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-7 items-start animate-fadeIn">
            <div className="lg:col-span-2 bg-[#FAF8F2]/95 border border-[#D8E5EE] rounded-3xl p-4 sm:p-6 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-serif-vn text-lg sm:text-xl font-bold text-[#283E52]">
                    Chọn 4 Bức Ảnh Ưng Ý Nhất ({selectedIndices.length} / 4)
                  </h2>
                  <p className="text-xs text-[#546E82]">
                    Chạm vào từng ảnh để chọn hoặc bỏ chọn. Đủ 4 bức sẽ ghép
                    thành dải Photobooth!
                  </p>
                </div>

                <span className="text-[11px] sm:text-xs font-medium px-3 py-1.5 rounded-full bg-[#EAF4EC] text-[#2E6B40] border border-[#B7DFC2]">
                  {uploadStatus === "UPLOADING"
                    ? "☁️ Đang lưu 8 ảnh vào Google Drive..."
                    : "✓ Đã đồng bộ cả 8 ảnh về Google Drive"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
                {capturedPhotos.map((photo, idx) => {
                  const selectedOrder = selectedIndices.indexOf(idx);
                  const isSelected = selectedOrder !== -1;

                  return (
                    <div
                      key={photo.id}
                      onClick={() => toggleSelectPhoto(idx)}
                      className={`group relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#5B89A6] ring-4 ring-[#5B89A6]/25 scale-[1.02]"
                          : "border-[#D8E5EE] opacity-80 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`Ảnh ${idx + 1}`}
                        className="w-full aspect-[4/3] object-cover block"
                      />
                      <div className="p-2 bg-white flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[#334B5E]">
                          Ảnh #{idx + 1}
                        </span>
                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-[#5B89A6] text-white text-[11px] font-bold flex items-center justify-center">
                            {selectedOrder + 1}
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full border border-[#B8CFE0] text-[10px] text-[#95ACB8] flex items-center justify-center">
                            +
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#FAF8F2]/95 border border-[#D8E5EE] rounded-3xl p-5 sm:p-6 shadow-md flex flex-col items-center">
              <h3 className="font-serif-vn text-lg font-bold text-[#283E52] mb-1">
                Dải Ảnh Photobooth (4 Ô)
              </h3>
              <p className="text-xs text-[#546E82] mb-4 text-center">
                Xem trước khung in của bạn
              </p>

              <div className="bg-gradient-to-b from-[#FCE8EE] via-[#E2F1FA] to-[#FFF4DA] p-4 rounded-2xl border-2 border-[#93BCD6] shadow-inner w-56 space-y-2.5">
                {[0, 1, 2, 3].map((slot) => {
                  const chosenIdx = selectedIndices[slot];
                  const photo =
                    chosenIdx !== undefined ? capturedPhotos[chosenIdx] : null;
                  return (
                    <div
                      key={slot}
                      className="w-full aspect-[4/3] rounded-lg bg-white border border-[#D8E5EE] overflow-hidden flex items-center justify-center"
                    >
                      {photo ? (
                        <img
                          src={photo.dataUrl}
                          alt={`Slot ${slot + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[11px] text-[#95ACB8]">
                          Ô ảnh thứ {slot + 1}
                        </span>
                      )}
                    </div>
                  );
                })}
                <div className="pt-2 text-center">
                  <p className="font-serif-vn text-[11px] font-bold text-[#283E52] tracking-wider">
                    ✦ HAPPY BIRTHDAY ✦
                  </p>
                  <p className="text-[9px] text-[#487594]">
                    🩺 Doctor Party Strip 🎂
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={selectedIndices.length !== 4}
                onClick={handleDownloadPhotostrip}
                className={`mt-5 w-full py-3.5 px-6 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  selectedIndices.length === 4
                    ? "bg-[#283E52] hover:bg-[#1D2F3F] text-white shadow-lg cursor-pointer"
                    : "bg-[#E2E8EC] text-[#95ACB8] cursor-not-allowed"
                }`}
              >
                <span>
                  {selectedIndices.length === 4
                    ? "⬇️ Tải Dải 4 Ảnh Photobooth Về Máy"
                    : `Hãy chọn thêm ${4 - selectedIndices.length} bức ảnh nữa`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleReturnToPrepareScreen}
                className="mt-2.5 w-full py-2.5 px-4 rounded-xl bg-[#EAF1F6] hover:bg-[#D6E5F0] text-[#334B5E] text-xs font-medium transition-all cursor-pointer"
              >
                Chụp lại lượt mới 📸
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT 3: TRANG CHÚC MỪNG 3D (TỐI ƯU RESPONSIVE MOBILE & DESKTOP)
// ============================================================================
function CelebrationPage({
  onOpenPhotobooth,
  hasWrittenWishOnce,
  onMarkWishWritten,
  candleState,
  setCandleState,
}: {
  onOpenPhotobooth: () => void;
  hasWrittenWishOnce: boolean;
  onMarkWishWritten: () => void;
  candleState: "UNLIT" | "LIT" | "BLOWING" | "BLOWN";
  setCandleState: React.Dispatch<
    React.SetStateAction<"UNLIT" | "LIT" | "BLOWING" | "BLOWN">
  >;
}) {
  const [wishText, setWishText] = useState("");
  const [isSendingWish, setIsSendingWish] = useState(false);
  const [showWishModal, setShowWishModal] = useState(false);
  const [isLetterVisible, setIsLetterVisible] = useState(false);

  const handleLightCandle = () => {
    setCandleState("LIT");
    if (!hasWrittenWishOnce) {
      setTimeout(() => {
        setShowWishModal(true);
      }, 850);
    }
  };

  const triggerRealisticBlowOut = (openLetterAfter = false) => {
    setCandleState("BLOWING");
    setTimeout(() => {
      setCandleState("BLOWN");
      if (openLetterAfter) {
        setTimeout(() => {
          setIsLetterVisible(true);
        }, 450);
      }
    }, 1500);
  };

  const handleFirstWishAndBlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishText.trim()) return;
    setIsSendingWish(true);

    await sendToGoogleOrWebhook({
      type: "BIRTHDAY_CANDLE_WISH",
      timestamp: new Date().toISOString(),
      wish: wishText.trim(),
    });

    setIsSendingWish(false);
    onMarkWishWritten();
    setShowWishModal(false);
    triggerRealisticBlowOut(true);
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex flex-col justify-between select-none">
      <BalloonsBackground />

      {/* Nút mở Photobooth responsive: Thu gọn gọn gàng trên điện thoại, đầy đủ trên máy tính */}
      <div className="fixed top-12 right-3 sm:top-20 sm:right-5 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={onOpenPhotobooth}
          className="group flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:px-4 sm:py-3 rounded-2xl bg-[#FAF8F2]/95 hover:bg-white border border-[#B8D2E3] shadow-[0_10px_28px_rgba(40,62,82,0.14)] text-[#283E52] transition-all hover:scale-105 cursor-pointer"
        >
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#5B89A6] text-white flex items-center justify-center text-sm sm:text-base shadow-sm">
            📸
          </span>
          <div className="text-left pr-0.5 sm:pr-1">
            <div className="text-[11px] sm:text-xs font-bold leading-tight text-[#283E52]">
              Photobooth
            </div>
            <div className="text-[9px] sm:text-[10px] text-[#5B89A6] font-medium hidden xs:block sm:block">
              Chụp 8 ảnh AR →
            </div>
          </div>
        </button>
      </div>

      {candleState === "BLOWING" && (
        <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center overflow-hidden">
          <div className="wind-streak w-96 h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent rounded-full" />
          <div
            style={{ animationDelay: "0.18s" }}
            className="wind-streak w-80 h-0.5 bg-gradient-to-r from-transparent via-[#CFE2EE] to-transparent rounded-full mt-12"
          />
        </div>
      )}

      <header className="relative z-20 pt-24 sm:pt-20 px-3 sm:px-4 text-center pointer-events-auto">
        <div className="inline-block bg-[#FAF8F2]/90 backdrop-blur-md border border-[#D8E5EE] px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-full shadow-sm max-w-[92vw]">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-[#487594] font-semibold">
            ✨ Happy Birthday To You ✨
          </p>
          <h1 className="font-serif-vn text-lg sm:text-3xl font-bold text-[#283E52] mt-0.5 truncate">
            Tuổi Mới Bình Yên Giữa Trời Xanh
          </h1>
        </div>
        <p className="text-[11px] sm:text-xs text-[#4A6275] mt-1.5 sm:mt-2 font-medium px-2">
          (Chạm tay hoặc dùng chuột xoay 360° quanh chiếc bánh sinh nhật 3D)
        </p>
      </header>

      <div className="relative z-10 w-full h-[46dvh] sm:h-[56vh] cursor-grab active:cursor-grabbing touch-none">
        <Canvas shadows camera={{ position: [0, 1.75, 4.3], fov: 42 }}>
          <ambientLight intensity={0.85} />
          <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
          <pointLight position={[-4, 3, -3]} intensity={0.45} color="#CFE2EE" />

          <Sparkles
            count={40}
            scale={4.5}
            size={2.2}
            speed={0.4}
            opacity={0.55}
            color="#7BA7C4"
          />

          <BirthdayCakeModel candleState={candleState} />

          <ContactShadows
            position={[0, -0.82, 0]}
            opacity={0.28}
            scale={6}
            blur={2.4}
            far={4}
          />
          <OrbitControls
            enablePan={false}
            minDistance={2.8}
            maxDistance={6.2}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.05}
          />
        </Canvas>
      </div>

      <footer className="relative z-20 pb-16 sm:pb-8 px-4 flex flex-col items-center gap-3 pointer-events-auto">
        {candleState === "UNLIT" && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <button
              onClick={handleLightCandle}
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-[#5B89A6] hover:bg-[#487594] text-white font-semibold text-xs sm:text-sm shadow-[0_10px_28px_rgba(91,137,166,0.38)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>🕯️ Thắp nến sinh nhật</span>
            </button>

            {hasWrittenWishOnce && (
              <button
                onClick={() => setIsLetterVisible((prev) => !prev)}
                className="px-6 sm:px-7 py-3.5 sm:py-4 rounded-2xl bg-[#283E52] hover:bg-[#1D2F3F] text-white font-semibold text-xs shadow-lg transition-all cursor-pointer"
              >
                {isLetterVisible ? "Ẩn lá thư 📖" : "Hiện lá thư chúc mừng 💌"}
              </button>
            )}
          </div>
        )}

        {candleState === "LIT" && !showWishModal && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {!hasWrittenWishOnce ? (
              <button
                onClick={() => setShowWishModal(true)}
                className="px-6 sm:px-7 py-3.5 rounded-2xl bg-[#283E52] hover:bg-[#1D2F3F] text-white font-semibold text-xs shadow-lg transition-all cursor-pointer"
              >
                ✨ Viết điều ước & Thổi nến
              </button>
            ) : (
              <button
                onClick={() => triggerRealisticBlowOut(false)}
                className="px-7 sm:px-8 py-3.5 rounded-2xl bg-[#5B89A6] hover:bg-[#487594] text-white font-semibold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2"
              >
                <span>🌬️ Thổi nến</span>
              </button>
            )}

            {hasWrittenWishOnce && (
              <button
                onClick={() => setIsLetterVisible((v) => !v)}
                className="px-5 sm:px-6 py-3.5 rounded-2xl bg-[#FAF8F2]/95 hover:bg-white text-[#283E52] border border-[#D8E5EE] font-semibold text-xs shadow-sm transition-all cursor-pointer"
              >
                {isLetterVisible ? "Ẩn trang sách 📖" : "Mở lại trang sách 💌"}
              </button>
            )}
          </div>
        )}

        {candleState === "BLOWING" && (
          <div className="px-5 sm:px-6 py-3 rounded-2xl bg-[#FAF8F2]/90 border border-[#D8E5EE] text-xs font-semibold text-[#487594] shadow-sm animate-pulse">
            🌬️ Làn gió biển đang thổi tắt ngọn nến...
          </div>
        )}

        {candleState === "BLOWN" && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setIsLetterVisible((prev) => !prev)}
              className="px-6 sm:px-7 py-3.5 rounded-2xl bg-[#283E52] hover:bg-[#1D2F3F] text-white font-semibold text-xs shadow-lg transition-all cursor-pointer"
            >
              {isLetterVisible ? "Ẩn lá thư 📖" : "Hiện lá thư chúc mừng 💌"}
            </button>

            <button
              onClick={handleLightCandle}
              className="px-5 py-3.5 rounded-2xl bg-[#FAF8F2]/90 hover:bg-white text-[#334B5E] border border-[#D8E5EE] font-medium text-xs shadow-sm transition-all cursor-pointer"
            >
              🕯️ Thắp nến lại
            </button>
          </div>
        )}
      </footer>

      {showWishModal && !hasWrittenWishOnce && (
        <div className="fixed inset-0 z-40 bg-[#182633]/35 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#FAF8F2] border border-[#D8E5EE] rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl">
            <div className="text-center mb-4">
              <span className="text-2xl">🕯️✨</span>
              <h3 className="font-serif-vn text-xl sm:text-2xl font-bold text-[#283E52] mt-1">
                Khoảnh Khắc Cầu Nguyện
              </h3>
              <p className="text-xs text-[#546E82] mt-1">
                Những ngọn nến đã bừng sáng ấm áp. Điều ước đầu tiên luôn là
                điều ước linh thiêng nhất...
              </p>
            </div>

            <form onSubmit={handleFirstWishAndBlow} className="space-y-4">
              <textarea
                rows={4}
                value={wishText}
                onChange={(e) => setWishText(e.target.value)}
                placeholder="Hãy nhắm mắt và viết điều ước của bạn vào đây..."
                className="w-full p-3.5 sm:p-4 rounded-2xl bg-white border border-[#D8E5EE] text-base sm:text-sm text-[#283E52] placeholder-[#95ACB8] focus:outline-none focus:border-[#5B89A6] resize-none"
                required
              />

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowWishModal(false)}
                  className="px-4 py-3 rounded-xl bg-[#EAF1F6] text-[#466075] text-xs font-medium cursor-pointer"
                >
                  Ngắm bánh thêm chút
                </button>
                <button
                  type="submit"
                  disabled={isSendingWish || !wishText.trim()}
                  className={`flex-1 py-3.5 px-5 rounded-xl text-xs font-semibold shadow-md transition-all ${
                    wishText.trim()
                      ? "bg-[#5B89A6] hover:bg-[#487594] text-white cursor-pointer"
                      : "bg-[#E2E8EC] text-[#95ACB8] cursor-not-allowed"
                  }`}
                >
                  {isSendingWish ? "Đang gửi điều ước..." : "Thổi nến 🌬️"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BookLetterModal
        isOpen={isLetterVisible}
        onClose={() => setIsLetterVisible(false)}
      />
    </div>
  );
}

// ============================================================================
// COMPONENT GỐC QUẢN LÝ CHUYỂN MÀN HÌNH & LƯU TRẠNG THÁI ĐÃ VIẾT ĐIỀU ƯỚC
// ============================================================================
export default function App() {
  const [screen, setScreen] = useState<
    "LOGIN" | "GAMES" | "CELEBRATION" | "PHOTOBOOTH"
  >("LOGIN");
  const [unlockedDigits, setUnlockedDigits] = useState<Array<string | null>>([
    null,
    null,
    null,
    null,
  ]);

  const [hasWrittenWishOnce, setHasWrittenWishOnce] = useState(false);
  const [candleState, setCandleState] = useState<
    "UNLIT" | "LIT" | "BLOWING" | "BLOWN"
  >("UNLIT");

  const handleUnlockDigit = (index: number, digitValue: string) => {
    setUnlockedDigits((prev) => {
      const next = [...prev];
      next[index] = digitValue;
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#F7F6F0] via-[#ECF3F8] to-[#F3EFE4] text-[#283E52] font-sans-vn antialiased selection:bg-[#CFE2EE] selection:text-[#1D3040] relative overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Lora:ital,wght@0,500;0,600;0,700;1,400;1,600&display=swap');

        .font-sans-vn {
          font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .font-serif-vn {
          font-family: 'Lora', Georgia, serif;
        }

        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(-1.5deg);
            opacity: 0;
          }
          10% {
            opacity: 0.92;
          }
          50% {
            transform: translateY(-55vh) rotate(2deg);
          }
          90% {
            opacity: 0.92;
          }
          100% {
            transform: translateY(-125vh) rotate(-1.5deg);
            opacity: 0;
          }
        }
        .balloon-float {
          animation-name: floatUp;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        @keyframes floatSparkle {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.35;
          }
          50% {
            transform: translateY(-16px) scale(1.18);
            opacity: 0.8;
          }
        }
        .animate-floatSparkle {
          animation-name: floatSparkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes windBlow {
          0% {
            transform: translateX(-45vw) scaleX(0.4);
            opacity: 0;
          }
          40% {
            opacity: 0.9;
          }
          100% {
            transform: translateX(45vw) scaleX(1.3);
            opacity: 0;
          }
        }
        .wind-streak {
          animation: windBlow 1.2s ease-out forwards;
        }

        @keyframes musicBar {
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
        .animate-musicBar1 {
          animation: musicBar 0.7s ease-in-out infinite;
        }
        .animate-musicBar2 {
          animation: musicBar 0.9s ease-in-out infinite 0.2s;
        }
        .animate-musicBar3 {
          animation: musicBar 0.6s ease-in-out infinite 0.4s;
        }

        .book-perspective {
          perspective: 1600px;
        }
        .book-cover {
          transform-origin: left center;
          transition: transform 1.15s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.9s ease;
          backface-visibility: hidden;
        }
        .book-cover-open {
          transform: rotateY(-165deg);
          opacity: 0;
        }
        .book-lines {
          background-image: linear-gradient(to bottom, transparent 95%, rgba(180, 206, 224, 0.28) 100%);
          background-size: 100% 2rem;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #F0ECE1;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #9ABBD1;
          border-radius: 9999px;
        }
      `}</style>

      <AmbientDecorations
        showBunting={screen !== "GAMES" && screen !== "PHOTOBOOTH"}
      />

      {/* Bộ phát nhạc tự động đổi theo màn hình: LOGIN tắt nhạc, GAMES phát bản 1, CELEBRATION/PHOTOBOOTH phát bản 2 */}
      <BackgroundMusicPlayer screen={screen} />

      {screen === "LOGIN" && (
        <Login
          unlockedDigits={unlockedDigits}
          onLoginSuccess={() => setScreen("CELEBRATION")}
          onGoToGames={() => setScreen("GAMES")}
        />
      )}

      {screen === "GAMES" && (
        <GameBoard
          unlockedDigits={unlockedDigits}
          onUnlockDigit={handleUnlockDigit}
          onBackToLogin={() => setScreen("LOGIN")}
        />
      )}

      {screen === "CELEBRATION" && (
        <CelebrationPage
          onOpenPhotobooth={() => setScreen("PHOTOBOOTH")}
          hasWrittenWishOnce={hasWrittenWishOnce}
          onMarkWishWritten={() => setHasWrittenWishOnce(true)}
          candleState={candleState}
          setCandleState={setCandleState}
        />
      )}

      {screen === "PHOTOBOOTH" && (
        <PhotoboothPage onBackToCake={() => setScreen("CELEBRATION")} />
      )}
    </div>
  );
}
