import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
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
  HƯỚNG DẪN NHẬN DỮ LIỆU CÂU HỎI + ĐIỀU ƯỚC + 8 BỨC ẢNH PHOTOBOOTH LƯU THẲNG VÀO GOOGLE DRIVE:
  1. Truy cập https://script.google.com/ -> Dự án mới (New Project)
  2. Dán đoạn mã Google Apps Script bên dưới vào rồi bấm Triển khai (Deploy) -> Ứng dụng web (Web App)
     -> Quyền truy cập: "Bất kỳ ai (Anyone)" -> Copy URL dán vào `appsScriptUrl` bên dưới:

  function doPost(e) {
    try {
      var body = JSON.parse(e.postData.contents);
      var folderName = "Birthday_Photobooth_And_Wishes";
      var folders = DriveApp.getFoldersByName(folderName);
      var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

      // Nếu là 8 bức ảnh từ Photobooth gửi về Drive
      if (body.type === "PHOTOBOOTH_8_PHOTOS" && body.photos) {
        var sessionFolder = folder.createFolder("Session_" + new Date().toISOString().replace(/[:.]/g, "-"));
        body.photos.forEach(function(item, idx) {
          var base64Data = item.dataUrl.split(",")[1];
          var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/png", "Photo_" + (idx + 1) + "_" + item.filterName + ".png");
          sessionFolder.createFile(blob);
        });
        return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
      }

      // Nếu là câu trả lời Thật hoặc Điều ước
      var docName = "Birthday_Responses_Log";
      var files = folder.getFilesByName(docName);
      var doc = files.hasNext() ? DocumentApp.openById(files.next().getId()) : DocumentApp.create(docName);
      if (!files.hasNext()) {
        DriveApp.getFileById(doc.getId()).moveTo(folder);
      }
      doc.getBody().appendParagraph("[" + body.timestamp + "] " + body.type + "\n" + body.formattedText + "\n--------------------");
      doc.saveAndClose();
      return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }
*/
const CONFIG = {
  // 0. CẤU HÌNH ÂM NHẠC PIANO NỀN (Tự động phát ngay khi vào)
  audioConfig: {
    customMp3Url: "",
    defaultVolume: 0.35,
  },

  // 1. CẤU HÌNH GỬI DỮ LIỆU & GỬI 8 ẢNH PHOTOBOOTH VỀ GOOGLE DRIVE
  submissionConfig: {
    mode: "APPS_SCRIPT",
    appsScriptUrl:
      "https://script.google.com/macros/s/YOUR_APPS_SCRIPT_DEPLOYMENT_ID/exec",
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
        q: "Sắc xanh dương Pastel của bầu trời và đại dương mang lại cảm giác gì?",
        options: [
          "Sự bình yên, tự do và niềm hy vọng dịu mát",
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
        q: "Biểu tượng làn sóng biển êm dịu và bầu trời trong xanh gợi nhắc điều gì?",
        options: [
          "Sự bao dung, bình yên và khởi đầu tươi mới",
          "Mùa đông lạnh giá",
          "Sự vội vã",
          "Cơn bão",
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

  // 7. Trang Chúc mừng 3D & Photobooth
  celebration: {
    balloonPhotos: [
      {
        url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=400&q=80",
        caption: "Khởi đầu dịu dàng",
      },
      {
        url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=400&q=80",
        caption: "Nụ cười tỏa nắng",
      },
      {
        url: "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=400&q=80",
        caption: "Tuổi mới bình yên",
      },
      {
        url: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=400&q=80",
        caption: "Khoảnh khắc đáng nhớ",
      },
      {
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
        caption: "Biển trời mênh mông",
      },
      {
        url: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=400&q=80",
        caption: "Rạng rỡ như hoa",
      },
    ],
    letterTitle: "Gửi Người Đặc Biệt Trong Ngày Sinh Nhật",
    letterContent: `Chúc mừng sinh nhật bạn nhé!

Vậy là bạn đã kiên nhẫn vượt qua tất cả những thử thách nhỏ nhắn (và có chút tinh nghịch) để mở ra trang sách nhỏ này. Khoảnh khắc ngọn nến vừa được thổi tắt cũng là lúc một hành trình tuổi mới chính thức bắt đầu — nhẹ nhàng, trong trẻo như sắc xanh của bầu trời và đại dương.

Cảm ơn bạn vì đã luôn mang đến một nguồn năng lượng thật ấm áp, dịu dàng cho thế giới xung quanh. Giữa nhịp sống đôi khi vội vã, mong rằng ở tuổi mới này, bạn sẽ luôn giữ được ánh mắt trong veo, nụ cười tự nhiên và một trái tim bình yên trước mọi thử thách.

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
  photos?: Array<{
    id: number;
    dataUrl: string;
    filterName: string;
    badge: string;
  }>;
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
// BỘ PHÁT NHẠC PIANO NHẸ NHÀNG (TỰ ĐỘNG PHÁT NGAY KHI VÀO TRANG, NÚT ĐỂ TẮT/BẬT)
// ============================================================================
const NOTE_FREQ: Record<string, number> = {
  C3: 130.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  Bb3: 233.08,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  Bb4: 466.16,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
};

const PIANO_SCORE = [
  { notes: ["C4"], dur: 0.45 },
  { notes: ["C4"], dur: 0.45 },
  { notes: ["D4", "F3", "A3"], dur: 0.9 },
  { notes: ["C4"], dur: 0.9 },
  { notes: ["F4", "A3", "C4"], dur: 0.9 },
  { notes: ["E4", "G3", "C4"], dur: 1.8 },

  { notes: ["C4"], dur: 0.45 },
  { notes: ["C4"], dur: 0.45 },
  { notes: ["D4", "G3", "Bb3"], dur: 0.9 },
  { notes: ["C4"], dur: 0.9 },
  { notes: ["G4", "Bb3", "E4"], dur: 0.9 },
  { notes: ["F4", "F3", "A3", "C4"], dur: 1.8 },

  { notes: ["C4"], dur: 0.45 },
  { notes: ["C4"], dur: 0.45 },
  { notes: ["C5", "F3", "A3", "F4"], dur: 0.9 },
  { notes: ["A4", "C4"], dur: 0.9 },
  { notes: ["F4", "Bb3", "D4"], dur: 0.9 },
  { notes: ["E4", "A3", "C4"], dur: 0.9 },
  { notes: ["D4", "G3", "Bb3"], dur: 1.5 },

  { notes: ["Bb4"], dur: 0.45 },
  { notes: ["Bb4"], dur: 0.45 },
  { notes: ["A4", "F3", "C4"], dur: 0.9 },
  { notes: ["F4", "A3"], dur: 0.9 },
  { notes: ["G4", "G3", "C4", "E4"], dur: 0.9 },
  { notes: ["F4", "F3", "A3", "C4"], dur: 2.2 },

  { notes: ["A4", "F3", "C4"], dur: 0.9 },
  { notes: ["G4", "C4", "E4"], dur: 0.9 },
  { notes: ["F4", "A3", "C4"], dur: 1.6 },
];

function GentlePianoPlayer() {
  const [isMutedByUser, setIsMutedByUser] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepIndexRef = useRef(0);
  const isRunningLoopRef = useRef(false);
  const isMutedRef = useRef(false);

  const playPianoChord = useCallback(
    (ctx: AudioContext, noteNames: string[], durationSec: number) => {
      if (isMutedRef.current || ctx.state !== "running") return;
      const now = ctx.currentTime;
      const masterVolume = CONFIG.audioConfig.defaultVolume || 0.35;

      noteNames.forEach((noteName, idx) => {
        const freq = NOTE_FREQ[noteName];
        if (!freq) return;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(freq * 3.2, now);
        filter.frequency.exponentialRampToValueAtTime(
          freq * 1.1,
          now + durationSec * 1.3,
        );

        const gainNode = ctx.createGain();
        const noteGain = (idx === 0 ? 0.22 : 0.1) * masterVolume;

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(noteGain, now + 0.035);
        gainNode.gain.exponentialRampToValueAtTime(
          noteGain * 0.35,
          now + durationSec * 0.55,
        );
        gainNode.gain.exponentialRampToValueAtTime(
          0.0001,
          now + durationSec * 1.65,
        );

        const oscMain = ctx.createOscillator();
        oscMain.type = "triangle";
        oscMain.frequency.setValueAtTime(freq, now);

        const oscHarmonic = ctx.createOscillator();
        oscHarmonic.type = "sine";
        oscHarmonic.frequency.setValueAtTime(freq * 2, now);

        const harmonicGain = ctx.createGain();
        harmonicGain.gain.setValueAtTime(noteGain * 0.18, now);
        harmonicGain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + durationSec * 0.7,
        );

        oscMain.connect(filter);
        oscHarmonic.connect(harmonicGain);
        harmonicGain.connect(filter);

        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscMain.start(now);
        oscHarmonic.start(now);
        oscMain.stop(now + durationSec * 1.7);
        oscHarmonic.stop(now + durationSec * 1.7);
      });
    },
    [],
  );

  const scheduleNextStep = useCallback(
    function runStep() {
      if (!isRunningLoopRef.current || isMutedRef.current) return;
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "running") {
        const currentItem = PIANO_SCORE[stepIndexRef.current];
        playPianoChord(ctx, currentItem.notes, currentItem.dur);
        stepIndexRef.current = (stepIndexRef.current + 1) % PIANO_SCORE.length;
        timerRef.current = setTimeout(runStep, currentItem.dur * 1000);
      } else {
        timerRef.current = setTimeout(runStep, 400);
      }
    },
    [playPianoChord],
  );

  const startMusicEngine = useCallback(async () => {
    if (isMutedRef.current) return;

    if (CONFIG.audioConfig.customMp3Url) {
      if (!htmlAudioRef.current) {
        htmlAudioRef.current = new Audio(CONFIG.audioConfig.customMp3Url);
        htmlAudioRef.current.loop = true;
        htmlAudioRef.current.volume = CONFIG.audioConfig.defaultVolume || 0.35;
      }
      try {
        await htmlAudioRef.current.play();
        isRunningLoopRef.current = true;
        return;
      } catch {
        // Fallback to Web Audio API synth
      }
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      try {
        await audioCtxRef.current.resume();
      } catch {
        // Browser may require user gesture before resuming
      }
    }

    if (!isRunningLoopRef.current) {
      isRunningLoopRef.current = true;
      scheduleNextStep();
    }
  }, [scheduleNextStep]);

  const stopMusicEngine = useCallback(() => {
    isRunningLoopRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
    }
  }, []);

  useEffect(() => {
    startMusicEngine();

    const unlockAudioOnAnyGesture = () => {
      if (!isMutedRef.current) {
        if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {
            // Ignore resume error
          });
        }
        if (!isRunningLoopRef.current) {
          startMusicEngine();
        }
      }
    };

    window.addEventListener("pointerdown", unlockAudioOnAnyGesture);
    window.addEventListener("keydown", unlockAudioOnAnyGesture);
    window.addEventListener("mousemove", unlockAudioOnAnyGesture, {
      once: true,
    });
    window.addEventListener("touchstart", unlockAudioOnAnyGesture, {
      once: true,
    });

    return () => {
      window.removeEventListener("pointerdown", unlockAudioOnAnyGesture);
      window.removeEventListener("keydown", unlockAudioOnAnyGesture);
      window.removeEventListener("mousemove", unlockAudioOnAnyGesture);
      window.removeEventListener("touchstart", unlockAudioOnAnyGesture);
      stopMusicEngine();
    };
  }, [startMusicEngine, stopMusicEngine]);

  const handleToggleButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isMutedByUser) {
      isMutedRef.current = true;
      setIsMutedByUser(true);
      stopMusicEngine();
    } else {
      isMutedRef.current = false;
      setIsMutedByUser(false);
      startMusicEngine();
    }
  };

  const activeSound = !isMutedByUser;

  return (
    <button
      type="button"
      onClick={handleToggleButton}
      title={activeSound ? "Nhấn để tắt âm thanh" : "Nhấn để bật lại âm thanh"}
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#FAF8F2]/95 hover:bg-white border border-[#C5D8E6] shadow-[0_8px_25px_rgba(44,68,90,0.14)] text-[#283E52] text-xs font-medium transition-all cursor-pointer group"
    >
      <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#E6F0F7] text-[#4A7896]">
        {activeSound ? "🎹" : "🔇"}
        {activeSound && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#5B89A6] animate-ping" />
        )}
      </span>
      <span className="hidden sm:inline font-medium">
        {activeSound ? "Tắt nhạc Piano" : "Bật nhạc Piano"}
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
        className="absolute -top-6 -left-6 w-56 h-56 md:w-72 md:h-72 text-[#5B89A6]/15 transform -rotate-12"
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
        className="absolute -bottom-8 -right-8 w-64 h-64 md:w-80 md:h-80 text-[#5B89A6]/15 transform rotate-165"
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
            className="w-full h-16 md:h-20"
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
// COMPONENT 1: TRANG ĐĂNG NHẬP (THEME XANH BẦU TRỜI & ĐẠI DƯƠNG PASTEL)
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="w-96 h-96 bg-[#D2E4F0]/60 rounded-full blur-3xl absolute -top-20 -left-20 pointer-events-none" />
      <div className="w-96 h-96 bg-[#EFE8D8]/80 rounded-full blur-3xl absolute -bottom-20 -right-20 pointer-events-none" />

      <div className="w-full max-w-md bg-[#FAF8F2]/90 backdrop-blur-md border border-[#D8E5EE] rounded-[2.25rem] shadow-[0_24px_60px_rgba(52,82,108,0.1)] p-8 md:p-10 relative z-10 transition-all duration-500">
        <div className="absolute inset-3 border border-[#E5DEC9]/70 rounded-[1.75rem] pointer-events-none" />

        <div className="text-center mb-7 relative">
          <div className="relative inline-flex items-center justify-center mb-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6B9BB8] to-[#487594] shadow-[0_6px_18px_rgba(72,117,148,0.35)] flex items-center justify-center border-2 border-[#E6DFC8]">
              <div className="w-12 h-12 rounded-full border border-dashed border-[#FAF8F2]/60 flex items-center justify-center">
                <span className="text-2xl select-none">🌊</span>
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
            <span className="h-[1px] w-8 bg-[#C4D6E3]" />
            <span className="text-[11px] uppercase tracking-[0.25em] text-[#5C7F96] font-semibold">
              Thiệp Mời Đặc Biệt
            </span>
            <span className="h-[1px] w-8 bg-[#C4D6E3]" />
          </div>

          <h1 className="font-serif-vn text-2xl md:text-3xl font-semibold text-[#283E52] tracking-tight">
            Cánh Cửa Sinh Nhật
          </h1>
          <p className="text-sm text-[#5E768A] mt-2 leading-relaxed">
            Nhập mã kỷ niệm để bước vào không gian bình yên của bầu trời và đại
            dương
          </p>
        </div>

        {hasAllDigits && (
          <div className="mb-6 p-3.5 rounded-2xl bg-[#EAF2F8] border border-[#B5D0E3] text-center text-xs text-[#2C5270] flex items-center justify-center gap-2 shadow-sm">
            <span>✨ Bạn đã thu thập đủ mật khẩu:</span>
            <strong className="tracking-widest text-sm font-bold bg-white px-2.5 py-0.5 rounded-lg border border-[#B5D0E3]">
              {suggestedPass}
            </strong>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs uppercase tracking-wider text-[#546E82] font-semibold">
                Tên đăng nhập (Username)
              </label>
              <span className="text-xs text-[#487594] bg-[#E8F1F7] px-2.5 py-0.5 rounded-full font-medium border border-[#C8DCEB]">
                💡 Gợi ý: {CONFIG.auth.usernameHint}
              </span>
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập 4 chữ số..."
              className="w-full px-4 py-3 rounded-xl bg-white/95 border border-[#D2E0EB] text-[#283E52] placeholder-[#95ACB8] focus:outline-none focus:border-[#5B89A6] focus:ring-2 focus:ring-[#5B89A6]/20 transition-all text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs uppercase tracking-wider text-[#546E82] font-semibold">
                Mật khẩu (Password)
              </label>
              <span className="text-xs text-[#487594] bg-[#E8F1F7] px-2.5 py-0.5 rounded-full font-medium border border-[#C8DCEB]">
                💡 Gợi ý: {CONFIG.auth.passwordHint}
              </span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu 4 chữ số..."
              className="w-full px-4 py-3 rounded-xl bg-white/95 border border-[#D2E0EB] text-[#283E52] placeholder-[#95ACB8] focus:outline-none focus:border-[#5B89A6] focus:ring-2 focus:ring-[#5B89A6]/20 transition-all text-sm"
            />
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F2CACA] text-[#A64444] text-xs leading-relaxed text-center animate-fadeIn">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 flex flex-col gap-3">
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
// MINI-GAME 2A: FLAPPY BIRD (ĐỘ KHÓ CAO & KHÓA CỨNG TẠI 49 ĐIỂM)
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
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[400px] mb-3 px-1">
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
          <span className="text-sm font-bold text-[#487594] bg-[#E3EFF7] px-3 py-1 rounded-full border border-[#B5D0E3]">
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
        className="relative rounded-2xl overflow-hidden border-2 border-[#C2D8E8] shadow-inner cursor-pointer select-none bg-[#E6F1F8]"
      >
        <canvas
          ref={canvasRef}
          width={400}
          height={260}
          className="block max-w-full h-auto"
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
          <div className="absolute inset-0 bg-[#283E52]/10 flex flex-col items-center justify-end pb-6 pointer-events-none">
            <div className="bg-white/95 px-4 py-2 rounded-full shadow-sm border border-[#C2D8E8] animate-bounce">
              <p className="text-xs font-semibold text-[#3B6480]">
                👆 Nhấp chuột hoặc nhấn phím Space để bay!
              </p>
            </div>
          </div>
        )}

        {status === "GAMEOVER" && (
          <div className="absolute inset-0 bg-[#FAF8F2]/95 backdrop-blur-[3px] flex flex-col items-center justify-center p-5 text-center animate-fadeIn">
            {(lastDeathScore ?? 0) >= CONFIG.game2.flappyTrapScore ? (
              <>
                <span className="text-2xl mb-1">😈🔒</span>
                <p className="text-sm font-bold text-[#B84A4A] mb-1">
                  49/50 ĐIỂM — CỘT THỨ 50 ĐÃ BỊ KHÓA KÍN!
                </p>
                <p className="text-xs text-[#546E82] mb-3 max-w-xs leading-relaxed">
                  Haha! Bạn bay siêu đỉnh nhưng hệ thống đã cố tình{" "}
                  <strong>khóa ở điểm 49</strong> rồi, không ai vượt qua được
                  cột thứ 50 đâu! Chọn <strong>&ldquo;Thật&rdquo;</strong> để mở
                  khóa mật khẩu nhé!
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-[#B85656] mb-1">
                  Va chạm mất rồi! ({lastDeathScore ?? 0}/{targetScore} cột)
                </p>
                <p className="text-xs text-[#546E82] mb-3 max-w-xs">
                  {(lastDeathScore ?? 0) >= 20
                    ? "Càng về cuối cột càng hẹp và nhấp nhô khó lường! Liệu có ai chạm nổi mốc 50?"
                    : "Cẩn thận nhịp vỗ cánh nhé, tốc độ sẽ tăng dần theo điểm số đấy!"}
                </p>
              </>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
                className="px-4 py-2 rounded-xl bg-[#E6F0F7] hover:bg-[#D4E5F2] text-[#283E52] text-xs font-semibold transition-all cursor-pointer border border-[#B5D0E3]"
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
                  className="px-4 py-2 rounded-xl bg-[#5B89A6] hover:bg-[#487594] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Đầu hàng & Chuyển sang &ldquo;Thật&rdquo; 💌
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#5E788C] mt-2 text-center">
        {deathsAt49 > 0
          ? "🤭 Bí mật nhỏ: Chế độ Thách bị khóa ở 49 điểm, hãy bấm sang nút 'Thật' ở trên để lấy mật khẩu nhé!"
          : "Mẹo: Nhấp chuột hoặc nhấn phím Space nhịp nhàng để giữ độ cao ổn định."}
      </p>
    </div>
  );
}

// ============================================================================
// COMPONENT 2: TRANG GIẢI MÃ (MÀN 1 & MÀN 3 TỰ ĐỘNG RESET KHI CHỌN SAI)
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

  // Khởi tạo trực tiếp mảng câu hỏi đã xáo trộn trong useState (Không cần gọi setState trong useEffect)
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
    <div className="min-h-screen pb-20 relative z-10">
      <header className="sticky top-0 z-30 bg-[#FAF8F2]/90 backdrop-blur-md border-b border-[#D8E5EE] shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToLogin}
              className="text-xs font-medium text-[#486880] hover:text-[#283E52] px-3 py-1.5 rounded-lg bg-[#EAF1F6] hover:bg-[#DAE7F0] transition-colors cursor-pointer"
            >
              ← Trang đăng nhập
            </button>
            <span className="text-xs text-[#647F94] hidden sm:inline">
              Hoàn thành lần lượt 4 thử thách để tìm mật khẩu
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#486880]">
              Mật khẩu của bạn:
            </span>
            <div className="flex items-center gap-2">
              {unlockedDigits.map((digit, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  title={`Chuyển tới Màn ${idx + 1}`}
                  className={`w-9 h-10 rounded-xl flex items-center justify-center font-bold text-base transition-all duration-300 cursor-pointer ${
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

      <main className="max-w-2xl mx-auto px-4 pt-7">
        <div className="mb-7">
          <div className="grid grid-cols-4 gap-2.5">
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
          <div className="mb-7 p-6 rounded-3xl bg-gradient-to-r from-[#E3EFF7] via-[#F5F2E6] to-[#E6F0F7] border border-[#B5D0E3] shadow-md text-center animate-fadeIn">
            <p className="text-xs uppercase tracking-widest text-[#487594] font-semibold mb-1">
              🎉 Chúc mừng bạn đã giải mã hoàn tất
            </p>
            <h2 className="font-serif-vn text-2xl font-bold text-[#283E52] mb-3">
              Mật khẩu hoàn chỉnh:{" "}
              <span className="tracking-widest text-[#487594]">
                {unlockedDigits.join("")}
              </span>
            </h2>
            <button
              onClick={onBackToLogin}
              className="px-8 py-3.5 rounded-2xl bg-[#283E52] hover:bg-[#1D2F3F] text-white text-sm font-medium shadow-md transition-all cursor-pointer"
            >
              Quay lại trang Đăng nhập ngay →
            </button>
          </div>
        )}

        <div className="bg-[#FAF8F2]/95 backdrop-blur-md border border-[#D8E5EE] rounded-3xl p-6 md:p-8 shadow-[0_16px_40px_rgba(52,82,108,0.07)] transition-all">
          {currentStep === 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#487594] bg-[#E6F0F7] px-3 py-1 rounded-full">
                  Trò chơi 1 / 4 • Trắc nghiệm
                </span>
                {unlockedDigits[0] !== null && (
                  <span className="text-xs font-semibold text-[#2E6B40] bg-[#E6F4EA] px-3 py-1 rounded-full">
                    ✓ Đã mở số [{unlockedDigits[0]}]
                  </span>
                )}
              </div>

              <h3 className="font-serif-vn text-xl font-semibold text-[#283E52] mb-2">
                Câu hỏi mở màn
              </h3>
              <p className="text-sm text-[#4A6275] mb-6 leading-relaxed">
                {CONFIG.game1.question}
              </p>

              <div className="space-y-3">
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
                      className={`w-full text-left p-4 rounded-2xl border text-sm transition-all flex items-start gap-3 cursor-pointer ${optionStyle}`}
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
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#487594] bg-[#E6F0F7] px-3 py-1 rounded-full">
                  Trò chơi 2 / 4 • Truth or Dare
                </span>
                {unlockedDigits[1] !== null && (
                  <span className="text-xs font-semibold text-[#2E6B40] bg-[#E6F4EA] px-3 py-1 rounded-full">
                    ✓ Đã mở số [{unlockedDigits[1]}]
                  </span>
                )}
              </div>

              <h3 className="font-serif-vn text-xl font-semibold text-[#283E52] mb-2">
                Thật hay Thách?
              </h3>
              <p className="text-sm text-[#4A6275] mb-5 leading-relaxed">
                Chọn <strong>Thật</strong> để trả lời 7 câu hỏi tâm sự, hoặc
                chọn <strong>Thách</strong> để vượt qua 50 chướng ngại vật
                Flappy Bird!
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setG2Mode("TRUTH")}
                  className={`py-3 px-4 rounded-2xl text-sm font-medium border transition-all cursor-pointer ${
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
                  className={`py-3 px-4 rounded-2xl text-sm font-medium border transition-all cursor-pointer ${
                    g2Mode === "DARE"
                      ? "bg-[#3A627D] text-white border-[#3A627D] shadow-sm"
                      : "bg-white text-[#334B5E] border-[#D8E5EE] hover:border-[#5B89A6]"
                  }`}
                >
                  🐦 Chọn Thách (50 cột)
                </button>
              </div>

              {g2Mode === "DARE" && (
                <div className="bg-white p-4 rounded-2xl border border-[#D8E5EE]">
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
                  className="space-y-3.5 bg-white p-5 rounded-2xl border border-[#D8E5EE] max-h-[420px] overflow-y-auto custom-scrollbar"
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
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F2] border border-[#D8E5EE] text-xs text-[#283E52] focus:outline-none focus:border-[#5B89A6]"
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
              <div className="flex items-center justify-between mb-4">
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

              <h3 className="font-serif-vn text-xl font-semibold text-[#283E52] mb-1">
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
                <div className="bg-white p-5 rounded-2xl border border-[#D8E5EE]">
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
                          className={`w-full text-left px-4 py-3 rounded-xl border text-xs transition-all flex items-center gap-3 cursor-pointer ${btnClass}`}
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
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#487594] bg-[#E6F0F7] px-3 py-1 rounded-full">
                  Trò chơi 4 / 4 • Giải Toán
                </span>
                {unlockedDigits[3] !== null && (
                  <span className="text-xs font-semibold text-[#2E6B40] bg-[#E6F4EA] px-3 py-1 rounded-full">
                    ✓ Đã mở số [{unlockedDigits[3]}]
                  </span>
                )}
              </div>

              <h3 className="font-serif-vn text-xl font-semibold text-[#283E52] mb-2">
                Thử thách tính nhẩm cuối cùng
              </h3>
              <div className="p-5 rounded-2xl bg-white border border-[#D8E5EE] mb-5">
                <p className="text-sm text-[#334B5E] leading-relaxed font-medium">
                  {CONFIG.game4.mathQuestion}
                </p>
              </div>

              <form onSubmit={handleMathSubmit} className="flex gap-3">
                <input
                  type="text"
                  disabled={unlockedDigits[3] !== null}
                  value={mathInput}
                  onChange={(e) => setMathInput(e.target.value)}
                  placeholder="Nhập đáp án của bạn..."
                  className="flex-1 px-4 py-3 rounded-xl bg-white border border-[#D8E5EE] text-sm text-[#283E52] focus:outline-none focus:border-[#5B89A6]"
                />
                <button
                  type="submit"
                  disabled={unlockedDigits[3] !== null || !hasMathText}
                  className={`px-6 py-3 rounded-xl text-xs font-semibold transition-all ${
                    unlockedDigits[3] === null && hasMathText
                      ? "bg-[#5B89A6] hover:bg-[#487594] text-white shadow-[0_6px_16px_rgba(91,137,166,0.3)] cursor-pointer scale-[1.02]"
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

          <div className="mt-7 pt-5 border-t border-[#E2ECF2] flex items-center justify-between">
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
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
                className={`px-6 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isCurrentStepDone
                    ? "bg-[#283E52] hover:bg-[#1D2F3F] text-white shadow-sm cursor-pointer animate-bounce"
                    : "bg-[#E8E5DC] text-[#A2B0BA] cursor-not-allowed"
                }`}
              >
                {isCurrentStepDone
                  ? "Tiếp tục sang Trò chơi tiếp theo →"
                  : "Hoàn thành màn này để mở màn tiếp theo"}
              </button>
            ) : (
              allUnlocked && (
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="px-6 py-2.5 rounded-xl bg-[#5B89A6] hover:bg-[#487594] text-white text-xs font-semibold shadow-sm cursor-pointer"
                >
                  Dùng mật khẩu đăng nhập ngay →
                </button>
              )
            )}
          </div>
        </div>
      </main>

      {showTeaseModal && (
        <div className="fixed inset-0 z-50 bg-[#1B2B38]/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF8F2] border border-[#D8E5EE] rounded-3xl max-w-md w-full p-7 shadow-2xl text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-[#E6F0F7] flex items-center justify-center mx-auto mb-3 text-2xl">
              😜
            </div>
            <h4 className="font-serif-vn text-xl font-bold text-[#283E52] mb-2">
              {CONFIG.game4.teasePopupTitle}
            </h4>
            <p className="text-sm text-[#4A6275] leading-relaxed mb-5">
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
// COMPONENT 3A: BÓNG BAY KÈM KHUNG ẢNH LƯỚT TỪ DƯỚI LÊN (PASTEL XANH DƯƠNG - KEM)
// ============================================================================
function BalloonsBackground() {
  const balloonItems = useMemo(() => {
    const colors = [
      "#93BCD6",
      "#D6E6F2",
      "#E8DFCA",
      "#B3D1E6",
      "#CFE2EE",
      "#EFE7D6",
    ];
    return CONFIG.celebration.balloonPhotos.map((photo, index) => ({
      ...photo,
      id: index,
      color: colors[index % colors.length],
      left: `${6 + index * 15}%`,
      duration: `${20 + (index % 3) * 4}s`,
      delay: `${index * 2.2}s`,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {balloonItems.map((item) => (
        <div
          key={item.id}
          style={{
            left: item.left,
            animationDuration: item.duration,
            animationDelay: item.delay,
          }}
          className="balloon-float absolute -bottom-72 flex flex-col items-center opacity-90"
        >
          <div
            style={{ backgroundColor: item.color }}
            className="w-16 h-20 rounded-[50%_50%_48%_48%/55%_55%_45%_45%] shadow-[inset_-6px_-6px_14px_rgba(0,0,0,0.06)] relative flex items-center justify-center border border-white/50"
          >
            <div className="w-3 h-6 bg-white/45 rounded-full absolute top-3 left-3 rotate-[-25deg]" />
            <div
              style={{ backgroundColor: item.color }}
              className="w-2.5 h-2 absolute -bottom-1 rotate-45"
            />
          </div>

          <div className="w-[1px] h-10 bg-[#95AFC2]/70" />

          <div className="bg-[#FAF8F2] p-2 pb-3 rounded-xl shadow-[0_10px_25px_rgba(40,62,82,0.1)] border border-[#D8E5EE] w-28 transform -rotate-2">
            <div className="w-8 h-2.5 bg-[#CFE2EE]/80 mx-auto -mt-3 mb-1 rounded-sm transform rotate-3" />
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-[#EAF1F6]">
              <img
                src={item.url}
                alt={item.caption}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <p className="text-[10px] text-center text-[#466075] mt-1.5 font-medium truncate">
              {item.caption}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENT 3B: BÁNH SINH NHẬT 3D (SẮC XANH BẦU TRỜI & KEM VANI)
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
      <group ref={groupRef as never} position={[0, -0.35, 0]}>
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
// COMPONENT 3C: LÁ THƯ HIỆN LÊN VÀ MỞ RA NHƯ MỘT TRANG SÁCH (3D BOOK ANIMATION)
// ============================================================================
function BookLetterInner({ onClose }: { onClose: () => void }) {
  const [bookOpened, setBookOpened] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBookOpened(true), 220);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-[#182633]/45 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="book-perspective w-full max-w-2xl">
        <div
          className={`relative bg-[#FAF8F2] border-2 border-[#CAD8E3] rounded-r-3xl rounded-l-xl shadow-[0_30px_80px_rgba(25,42,58,0.38)] overflow-hidden transition-all duration-1000 ${
            bookOpened ? "scale-100 opacity-100" : "scale-95 opacity-90"
          }`}
        >
          <div className="absolute top-0 bottom-0 left-0 w-7 bg-gradient-to-r from-[#C2D3E0] via-[#E4EDF4] to-transparent pointer-events-none z-20" />

          <div className="absolute -top-1 right-10 w-6 h-16 bg-[#5B89A6] shadow-md z-20 flex items-end justify-center pb-1 rounded-b-sm">
            <span className="text-[10px] text-white">✦</span>
          </div>

          <div
            className={`book-cover absolute inset-0 bg-gradient-to-br from-[#487594] to-[#2B4C66] z-30 flex flex-col items-center justify-center text-white p-8 pointer-events-none ${
              bookOpened ? "book-cover-open" : ""
            }`}
          >
            <div className="border border-white/30 rounded-2xl p-8 text-center">
              <span className="text-3xl mb-2 block">📖</span>
              <p className="text-xs uppercase tracking-[0.25em] text-[#CFE2EE] mb-2">
                Nhật Ký Tuổi Mới
              </p>
              <h3 className="font-serif-vn text-2xl font-bold">
                Trang Sách Sinh Nhật
              </h3>
            </div>
          </div>

          <div className="p-7 sm:p-10 pl-10 sm:pl-14 max-h-[82vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#D8E5EE] pb-4 mb-5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#5B89A6]">
                  🌊 Trang sách kỷ niệm • Lời chúc tuổi mới
                </span>
                <h2 className="font-serif-vn text-2xl sm:text-3xl font-bold text-[#283E52] mt-0.5">
                  {CONFIG.celebration.letterTitle}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-[#EAF1F6] hover:bg-[#DAE7F0] text-[#334B5E] flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                title="Gấp sách lại để ngắm bánh"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-2 space-y-4 text-sm sm:text-[15px] text-[#2F4659] leading-relaxed whitespace-pre-line font-normal custom-scrollbar book-lines">
              {CONFIG.celebration.letterContent}

              <div className="pt-4 pb-2 text-right font-serif-vn italic text-[#487594] font-semibold text-base">
                — {CONFIG.celebration.letterSign}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[#D8E5EE] flex items-center justify-between">
              <span className="text-xs text-[#6E879B] italic font-serif-vn">
                Trang 01 / 01
              </span>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#5B89A6] hover:bg-[#487594] text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
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
// COMPONENT 4: TRANG TIỆM PHOTOBOOTH SINH NHẬT (KHUNG PURIKURA SIÊU CẦU KỲ + ĐỒ HỌA RỰC RỠ)
// ============================================================================
const PHOTOBOOTH_FILTERS = [
  {
    id: "royal_crown_party",
    name: "1. Vương Miện Hoàng Gia & Gấu Teddy",
    badge: "👑 Hoàng Gia & Gấu",
    cssFilter: "brightness(1.08) contrast(0.96) saturate(1.08)",
    tint: "rgba(255, 248, 238, 0.11)",
    framePrimary: "#FCE8EE",
    frameSecondary: "#CFE6F7",
    accentColor: "#D4A359",
    patternType: "STRIPES",
    stickerText: " Princess Day! ✨",
  },
  {
    id: "ocean_carnival_hat",
    name: "2. Nón Tiệc Đại Dương & Mèo Tiệc Tùng",
    badge: "🎉 Nón Tiệc & Mèo",
    cssFilter: "brightness(1.1) contrast(0.95) saturate(1.06)",
    tint: "rgba(205, 232, 250, 0.13)",
    framePrimary: "#D2ECFA",
    frameSecondary: "#FFF2CC",
    accentColor: "#4A88B0",
    patternType: "DOTS",
    stickerText: "Party Time! 🎈",
  },
  {
    id: "sweet_bunny_lace",
    name: "3. Tai Thỏ Bông Kem & Tiệc Bánh Dâu",
    badge: "🐰 Tai Thỏ & Bánh Dâu",
    cssFilter: "brightness(1.11) contrast(0.94) saturate(1.05)",
    tint: "rgba(255, 236, 242, 0.14)",
    framePrimary: "#FFD9E6",
    frameSecondary: "#FFF9F2",
    accentColor: "#E07A9B",
    patternType: "GINGHAM",
    stickerText: "So Sweet! 🍓",
  },
  {
    id: "tea_party_glasses",
    name: "4. Kính Ngọc Trai & Tiệc Trà Macaron",
    badge: "👓 Kính & Macaron",
    cssFilter: "brightness(1.07) contrast(0.97) sepia(0.08) saturate(1.06)",
    tint: "rgba(250, 240, 220, 0.13)",
    framePrimary: "#F9E6C8",
    frameSecondary: "#DDF0E6",
    accentColor: "#C58F4E",
    patternType: "STRIPES",
    stickerText: "Tea Party ☕",
  },
  {
    id: "starlight_tiara",
    name: "5. Hào Quang Ánh Sao & Thỏ Cung Trăng",
    badge: "✨ Sao Đêm & Trăng",
    cssFilter: "brightness(1.09) contrast(0.96) saturate(1.1)",
    tint: "rgba(215, 230, 252, 0.14)",
    framePrimary: "#D7E3FC",
    frameSecondary: "#F3DDF7",
    accentColor: "#6384B8",
    patternType: "DOTS",
    stickerText: "Make a Wish 🌙",
  },
  {
    id: "daisy_flora_wreath",
    name: "6. Vòng Hoa Cúc Họa Mi & Cún Poodle",
    badge: "🌼 Hoa Cúc & Cún",
    cssFilter: "brightness(1.1) contrast(0.95) saturate(1.07)",
    tint: "rgba(250, 248, 232, 0.12)",
    framePrimary: "#E2F4DC",
    frameSecondary: "#FFF5C8",
    accentColor: "#6DA862",
    patternType: "GINGHAM",
    stickerText: "Bloom & Smile 🌼",
  },
  {
    id: "coquette_double_bows",
    name: "7. Đôi Nơ Lụa Coquette & Vịt Vàng Cute",
    badge: "🎀 Đôi Nơ & Vịt Cute",
    cssFilter: "brightness(1.11) contrast(0.94) saturate(1.06)",
    tint: "rgba(222, 240, 252, 0.14)",
    framePrimary: "#D8EEFC",
    frameSecondary: "#FDE2EC",
    accentColor: "#5D97BD",
    patternType: "STRIPES",
    stickerText: "Happy B-Day 🎀",
  },
  {
    id: "sunset_pearl_mermaid",
    name: "8. Ngọc Trai Tiên Cá & Kẹo Mút Cầu Vồng",
    badge: "🐚 Ngọc Trai & Kẹo",
    cssFilter: "brightness(1.08) contrast(0.97) sepia(0.05) saturate(1.12)",
    tint: "rgba(255, 232, 212, 0.13)",
    framePrimary: "#FFE0D2",
    frameSecondary: "#D6F0F7",
    accentColor: "#D97F64",
    patternType: "DOTS",
    stickerText: "Shining You 🐚",
  },
];

// --- BỘ HÀM VẼ ĐỒ HỌA NHÂN VẬT CHIBI, BÁNH KẸO & HOẠ TIẾT KHUNG PURIKURA CẦU KỲ ---

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

function drawCuteTeddyBear(
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
  ctx.ellipse(0, 26, 20, 16, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#D6A87E";
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fillStyle = "#D6A87E";
  ctx.fill();
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

  ctx.fillStyle = "rgba(244, 130, 150, 0.6)";
  ctx.beginPath();
  ctx.ellipse(-14, 3, 5, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(14, 3, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#F28B9F";
  ctx.beginPath();
  ctx.ellipse(-7, 17, 7, 4, -0.2, 0, Math.PI * 2);
  ctx.ellipse(7, 17, 7, 4, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-12, -22);
  ctx.lineTo(0, -46);
  ctx.lineTo(12, -22);
  ctx.closePath();
  ctx.fillStyle = "#79B4D9";
  ctx.fill();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -48, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#FFE066";
  ctx.fill();

  ctx.restore();
}

function drawCuteBunnyCharacter(
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

  ctx.fillStyle = "rgba(247, 150, 172, 0.65)";
  ctx.beginPath();
  ctx.ellipse(-13, 4, 5, 2.8, 0, 0, Math.PI * 2);
  ctx.ellipse(13, 4, 5, 2.8, 0, 0, Math.PI * 2);
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

function drawCuteKittyCharacter(
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

  ctx.fillStyle = "#FFD166";
  ctx.strokeStyle = "#C9972C";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-10, -18);
  ctx.lineTo(-8, -29);
  ctx.lineTo(-3, -22);
  ctx.lineTo(0, -31);
  ctx.lineTo(3, -22);
  ctx.lineTo(8, -29);
  ctx.lineTo(10, -18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

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

  ctx.fillStyle = "rgba(244, 145, 165, 0.55)";
  ctx.beginPath();
  ctx.ellipse(-13, 4, 4.5, 2.5, 0, 0, Math.PI * 2);
  ctx.ellipse(13, 4, 4.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSwirlLollipop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#D0C4B4";
  ctx.lineWidth = 1.5;
  ctx.fillRect(-2.5, 10, 5, 26);
  ctx.strokeRect(-2.5, 10, 5, 26);

  const rings: Array<[number, string]> = [
    [16, "#FFACC7"],
    [12.5, "#FFF6D6"],
    [9, "#98CEF0"],
    [5.5, "#FFFFFF"],
  ];
  rings.forEach(([r, c]) => {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  });
  ctx.strokeStyle = "#E0809E";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#79B4D9";
  ctx.beginPath();
  ctx.ellipse(-6, 16, 6, 3.5, -0.3, 0, Math.PI * 2);
  ctx.ellipse(6, 16, 6, 3.5, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPastelMacaron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  topColor = "#F9B8C8",
  creamColor = "#FFFDF7",
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = topColor;
  ctx.strokeStyle = "#D48A9E";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.ellipse(0, 5, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = creamColor;
  ctx.beginPath();
  ctx.roundRect(-17, -2, 34, 6, 3);
  ctx.fill();

  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.ellipse(0, -5, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
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
  ctx.roundRect(-52, -15, 104, 28, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#283E52";
  ctx.font = "bold 11px 'Be Vietnam Pro', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, 0, 3);

  ctx.restore();
}

// ============================================================================
// HÀM CHÍNH: VẼ KHUNG ẢNH PURIKURA ĐA TẦNG SIÊU BẮT MẮT + NHÂN VẬT + PHỤ KIỆN
// ============================================================================
function drawFilterAccessoryOnCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  filterIndex: number,
) {
  const filter = PHOTOBOOTH_FILTERS[filterIndex % PHOTOBOOTH_FILTERS.length];

  ctx.save();

  ctx.fillStyle = filter.tint;
  ctx.fillRect(0, 0, w, h);

  const softGlow = ctx.createRadialGradient(
    w / 2,
    h / 2,
    w * 0.2,
    w / 2,
    h / 2,
    w * 0.72,
  );
  softGlow.addColorStop(0, "rgba(255,255,255,0)");
  softGlow.addColorStop(1, "rgba(250, 246, 238, 0.22)");
  ctx.fillStyle = softGlow;
  ctx.fillRect(0, 0, w, h);

  const blushL = ctx.createRadialGradient(
    w * 0.39,
    h * 0.53,
    2,
    w * 0.39,
    h * 0.53,
    w * 0.07,
  );
  blushL.addColorStop(0, "rgba(244, 150, 172, 0.24)");
  blushL.addColorStop(1, "rgba(244, 150, 172, 0)");
  ctx.fillStyle = blushL;
  ctx.fillRect(0, 0, w, h);

  const blushR = ctx.createRadialGradient(
    w * 0.61,
    h * 0.53,
    2,
    w * 0.61,
    h * 0.53,
    w * 0.07,
  );
  blushR.addColorStop(0, "rgba(244, 150, 172, 0.24)");
  blushR.addColorStop(1, "rgba(244, 150, 172, 0)");
  ctx.fillStyle = blushR;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const headY = h * 0.22;

  if (filterIndex === 0) {
    ctx.save();
    ctx.shadowColor = "rgba(212, 175, 106, 0.5)";
    ctx.shadowBlur = 10;

    const crownGrad = ctx.createLinearGradient(
      cx - 75,
      headY - 50,
      cx + 75,
      headY + 20,
    );
    crownGrad.addColorStop(0, "#E5C178");
    crownGrad.addColorStop(0.5, "#FFF4D4");
    crownGrad.addColorStop(1, "#D1A654");

    ctx.fillStyle = crownGrad;
    ctx.strokeStyle = "#B38736";
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(cx - 68, headY + 18);
    ctx.quadraticCurveTo(cx - 62, headY - 18, cx - 44, headY - 26);
    ctx.quadraticCurveTo(cx - 28, headY + 2, cx - 22, headY - 12);
    ctx.quadraticCurveTo(cx - 10, headY - 38, cx, headY - 52);
    ctx.quadraticCurveTo(cx + 10, headY - 38, cx + 22, headY - 12);
    ctx.quadraticCurveTo(cx + 28, headY + 2, cx + 44, headY - 26);
    ctx.quadraticCurveTo(cx + 62, headY - 18, cx + 68, headY + 18);
    ctx.quadraticCurveTo(cx, headY + 8, cx - 68, headY + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#5B89A6";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, headY - 32);
    ctx.quadraticCurveTo(cx + 12, headY - 16, cx, headY - 8);
    ctx.quadraticCurveTo(cx - 12, headY - 16, cx, headY - 32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    [cx - 34, cx + 34].forEach((gx) => {
      ctx.fillStyle = "#F29BB0";
      ctx.beginPath();
      ctx.arc(gx, headY - 8, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    const pearls = [
      [cx - 52, headY + 12, 3.5],
      [cx - 35, headY + 10, 4],
      [cx - 18, headY + 8, 4],
      [cx, headY + 7, 4.5],
      [cx + 18, headY + 8, 4],
      [cx + 35, headY + 10, 4],
      [cx + 52, headY + 12, 3.5],
      [cx - 44, headY - 29, 5],
      [cx - 22, headY - 15, 4],
      [cx, headY - 56, 6.5],
      [cx + 22, headY - 15, 4],
      [cx + 44, headY - 29, 5],
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
    ctx.translate(cx + 8, headY - 2);
    ctx.rotate(0.12);

    for (let i = -38; i <= 38; i += 11) {
      ctx.beginPath();
      ctx.arc(i, 24, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFDF9";
      ctx.fill();
      ctx.strokeStyle = "#8BB8D6";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-42, 24);
    ctx.lineTo(0, -64);
    ctx.lineTo(42, 24);
    ctx.closePath();
    ctx.clip();

    const hatGrad = ctx.createLinearGradient(-40, -60, 40, 24);
    hatGrad.addColorStop(0, "#7EC0E8");
    hatGrad.addColorStop(1, "#F9C5D5");
    ctx.fillStyle = hatGrad;
    ctx.fillRect(-50, -70, 100, 100);

    ctx.strokeStyle = "rgba(255, 250, 240, 0.9)";
    ctx.lineWidth = 8;
    for (let y = -60; y <= 40; y += 22) {
      ctx.beginPath();
      ctx.moveTo(-50, y);
      ctx.lineTo(50, y + 25);
      ctx.stroke();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(-42, 24);
    ctx.lineTo(0, -64);
    ctx.lineTo(42, 24);
    ctx.closePath();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = "#FFD166";
    ctx.font = "bold 18px serif";
    ctx.fillText("★", -8, -6);

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
  } else if (filterIndex === 2) {
    ctx.save();
    ctx.strokeStyle = "#FFFDF9";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, headY + 38, 72, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();

    ctx.save();
    ctx.translate(cx - 42, headY - 16);
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
    ctx.translate(cx + 42, headY - 12);
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

    ctx.fillStyle = "#E8889E";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-11, 34, 11, 6.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(11, 34, 11, 6.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 34, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#FFF8E7";
    ctx.fill();
    ctx.restore();
    ctx.restore();
  } else if (filterIndex === 3) {
    ctx.save();
    const eyeY = h * 0.44;

    [cx - 46, cx + 46].forEach((gx) => {
      ctx.fillStyle = "rgba(255, 252, 245, 0.14)";
      ctx.beginPath();
      ctx.arc(gx, eyeY, 31, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#D4AF6A";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(gx, eyeY, 31, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(gx - 18, eyeY - 16);
      ctx.lineTo(gx - 6, eyeY - 24);
      ctx.stroke();
    });

    ctx.strokeStyle = "#D4AF6A";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 15, eyeY - 2);
    ctx.quadraticCurveTo(cx, eyeY - 10, cx + 15, eyeY - 2);
    ctx.stroke();

    [-1, 1].forEach((dir) => {
      const startX = cx + dir * 77;
      for (let i = 0; i < 8; i++) {
        const py = eyeY + 4 + i * 9;
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
    ctx.strokeStyle = "rgba(255, 248, 214, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, headY + 6, 92, 28, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();

    ctx.fillStyle = "#FFF3B8";
    ctx.beginPath();
    ctx.arc(cx, headY - 26, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#DCE7F7";
    ctx.beginPath();
    ctx.arc(cx + 6, headY - 30, 12, 0, Math.PI * 2);
    ctx.fill();

    const starPositions = [
      [cx - 84, headY + 10, 9],
      [cx - 56, headY - 10, 12],
      [cx - 28, headY - 20, 8],
      [cx + 28, headY - 20, 8],
      [cx + 56, headY - 10, 12],
      [cx + 84, headY + 10, 9],
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
    ctx.strokeStyle = "#7BA675";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, headY + 46, 86, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();

    const daisyNodes = [
      [cx - 72, headY + 12, 0.85],
      [cx - 48, headY - 2, 1],
      [cx - 24, headY - 10, 0.9],
      [cx, headY - 13, 1.15],
      [cx + 24, headY - 10, 0.9],
      [cx + 48, headY - 2, 1],
      [cx + 72, headY + 12, 0.85],
    ];

    daisyNodes.forEach(([fx, fy]) => {
      ctx.fillStyle = "#8BB884";
      ctx.beginPath();
      ctx.ellipse(fx - 10, fy + 5, 8, 4, -0.5, 0, Math.PI * 2);
      ctx.ellipse(fx + 10, fy + 5, 8, 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    daisyNodes.forEach(([fx, fy, sc]) => {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.scale(sc, sc);
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
    [
      { x: cx - 76, y: headY + 4, rot: -0.22 },
      { x: cx + 76, y: headY + 4, rot: 0.22 },
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
    ctx.fillStyle = "#FAD9C8";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, headY - 10, 22, Math.PI, 0);
    ctx.lineTo(cx, headY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, headY - 3, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFDF9";
    ctx.fill();

    [cx - 46, cx + 46].forEach((sx) => {
      ctx.fillStyle = "#F4B393";
      ctx.beginPath();
      ctx.arc(sx, headY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  const borderT = 30;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.roundRect(borderT, borderT, w - borderT * 2, h - borderT * 2, 26);
  ctx.clip("evenodd");

  ctx.fillStyle = filter.framePrimary;
  ctx.fillRect(0, 0, w, h);

  if (filter.patternType === "STRIPES") {
    ctx.strokeStyle = filter.frameSecondary;
    ctx.lineWidth = 12;
    for (let i = -h; i < w + h; i += 26) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
    }
  } else if (filter.patternType === "DOTS") {
    ctx.fillStyle = filter.frameSecondary;
    for (let x = 14; x < w; x += 28) {
      for (let y = 14; y < h; y += 28) {
        ctx.beginPath();
        ctx.arc(x + ((y / 28) % 2 === 0 ? 0 : 12), y, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    for (let x = 0; x < w; x += 28) {
      ctx.fillRect(x, 0, 14, h);
    }
    for (let y = 0; y < h; y += 28) {
      ctx.fillRect(0, y, w, 14);
    }
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#FFFDF9";
  ctx.strokeStyle = filter.accentColor;
  ctx.lineWidth = 1.6;

  for (let x = borderT + 14; x <= w - borderT - 14; x += 22) {
    [borderT, h - borderT].forEach((ly) => {
      ctx.beginPath();
      ctx.arc(x, ly, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, ly, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = filter.accentColor;
      ctx.fill();
      ctx.fillStyle = "#FFFDF9";
    });
  }

  for (let y = borderT + 14; y <= h - borderT - 14; y += 22) {
    [borderT, w - borderT].forEach((lx) => {
      ctx.beginPath();
      ctx.arc(lx, y, 9, 0, Math.PI * 2);
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
  ctx.roundRect(borderT, borderT, w - borderT * 2, h - borderT * 2, 26);
  ctx.strokeStyle = filter.accentColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 16);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2.5;
  ctx.stroke();
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
    ctx.moveTo(fx1, 20 + sag);
    ctx.lineTo(fx2, 20 + sag);
    ctx.lineTo(fmid, 46 + sag);
    ctx.closePath();
    ctx.fillStyle = flagColors[i % flagColors.length];
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  drawCornerSatinBow(ctx, 36, 34, "#F497B0", "#FFFFFF", 0.9);
  drawCornerSatinBow(ctx, w - 36, 34, "#79B4D9", "#FFFFFF", 0.9);
  drawCornerSatinBow(ctx, 34, h - 108, "#79B4D9", "#FFFFFF", 0.78);
  drawCornerSatinBow(ctx, w - 34, h - 108, "#F497B0", "#FFFFFF", 0.78);

  drawBalloonCluster(ctx, 44, 118, 0.85);
  drawBalloonCluster(ctx, w - 44, 118, 0.85);

  drawSwirlLollipop(ctx, 38, 225, 0.88);
  drawSwirlLollipop(ctx, w - 38, 225, 0.88);

  drawPastelMacaron(ctx, 40, 305, "#FFACC7", "#FFFDF7", 0.82);
  drawPastelMacaron(ctx, w - 40, 305, "#98CEF0", "#FFFDF7", 0.82);

  drawCuteSpeechSticker(
    ctx,
    112,
    68,
    filter.stickerText,
    "#FFFDF9",
    filter.accentColor,
  );
  drawCuteSpeechSticker(
    ctx,
    w - 108,
    68,
    "Happy B-Day! 🎉",
    "#FFFDF9",
    "#79B4D9",
  );

  if (filterIndex % 4 === 0) {
    drawCuteTeddyBear(ctx, 68, h - 56, 0.94);
    drawCuteBunnyCharacter(ctx, w - 68, h - 52, 0.96);
  } else if (filterIndex % 4 === 1) {
    drawCuteBunnyCharacter(ctx, 66, h - 52, 0.96);
    drawCuteKittyCharacter(ctx, w - 68, h - 52, 0.96);
  } else if (filterIndex % 4 === 2) {
    drawCutePoodlePuppy(ctx, 66, h - 52, 0.96);
    drawCuteBunnyCharacter(ctx, w - 68, h - 52, 0.96);
  } else {
    drawCuteKittyCharacter(ctx, 66, h - 52, 0.96);
    drawCuteTeddyBear(ctx, w - 68, h - 56, 0.94);
  }

  drawMiniBirthdayCakeIcon(ctx, 128, h - 42, 0.88);
  drawCuteGiftBox(ctx, w - 128, h - 40, "#CFE6F7", "#F28B9F", 0.88);

  const bannerW = 306;
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
  ctx.fillText(`🎂 HAPPY BIRTHDAY • ${filter.badge}`, w / 2, by + 24);

  ctx.restore();
}

interface CapturedPhoto {
  id: number;
  dataUrl: string;
  filterName: string;
  badge: string;
}

function PhotoboothPage({ onBackToCake }: { onBackToCake: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [activeFilterIdx, setActiveFilterIdx] = useState(0);

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

  // Hàm kết nối lại luồng Camera (chỉ cập nhật state bên trong callback bất đồng bộ để tuân thủ React Hooks Lint)
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
          "Không tìm thấy hoặc chưa cấp quyền Camera. Hệ thống đã bật Chế độ Giả lập Studio để bạn vẫn trải nghiệm chụp đủ 8 khung ảnh sinh nhật!",
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

          ctx.clearRect(0, 0, w, h);
          ctx.save();
          ctx.filter = filterObj.cssFilter;

          if (video && video.readyState >= 2 && !cameraError) {
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, w, h);
          } else {
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, "#DCECF7");
            grad.addColorStop(1, "#F7F2E7");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
            ctx.beginPath();
            ctx.arc(w / 2, h * 0.49, 78, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#487594";
            ctx.font = "600 15px 'Be Vietnam Pro', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("📸 Khung Hình Studio Sinh Nhật", w / 2, h * 0.49 + 5);
          }
          ctx.restore();

          drawFilterAccessoryOnCanvas(ctx, w, h, activeFilterIdx);
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
        const currentFilter = PHOTOBOOTH_FILTERS[currentShotIdx];

        setFlashEffect(true);
        setTimeout(() => setFlashEffect(false), 260);

        setCapturedPhotos((prev) => {
          const next = [
            ...prev,
            {
              id: currentShotIdx,
              dataUrl,
              filterName: currentFilter.name,
              badge: currentFilter.badge,
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

  // Khi bấm "Chụp lại": quay về màn hình chuẩn bị (IDLE) với Camera bật sẵn, đợi người dùng bấm nút chụp
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
    const footerH = 145;

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

    drawCuteTeddyBear(ctx, 82, stripCanvas.height - 66, 0.92);
    drawCuteBunnyCharacter(
      ctx,
      stripCanvas.width - 82,
      stripCanvas.height - 62,
      0.95,
    );

    ctx.fillStyle = "#283E52";
    ctx.font = "bold 23px 'Lora', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "✦ HAPPY BIRTHDAY PARTY ✦",
      stripCanvas.width / 2,
      stripCanvas.height - 70,
    );

    ctx.fillStyle = "#487594";
    ctx.font = "600 14px 'Be Vietnam Pro', sans-serif";
    ctx.fillText(
      `Kỷ niệm ngọt ngào • ${new Date().toLocaleDateString("vi-VN")}`,
      stripCanvas.width / 2,
      stripCanvas.height - 38,
    );

    const link = document.createElement("a");
    link.download = `Birthday_Photobooth_${Date.now()}.png`;
    link.href = stripCanvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="min-h-screen py-8 px-4 relative z-20">
      {/* Giữ thẻ video luôn cố định trong DOM để không bị ngắt kết nối Camera khi chuyển màn hình */}
      <video ref={videoRef} playsInline muted autoPlay className="hidden" />

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-[#FAF8F2]/90 backdrop-blur-md border border-[#D8E5EE] px-6 py-4 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToCake}
              className="px-4 py-2 rounded-xl bg-[#EAF1F6] hover:bg-[#D6E5F0] text-[#283E52] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>← Quay lại trang Bánh Kem 3D</span>
            </button>
            <div>
              <h1 className="font-serif-vn text-xl sm:text-2xl font-bold text-[#283E52]">
                Tiệm Photobooth Sinh Nhật 📸
              </h1>
              <p className="text-xs text-[#546E82]">
                8 Khung Purikura họa tiết cầu kỳ & Nhân vật dễ thương • Tự động
                chụp 8 tấm (8 giây/tấm)
              </p>
            </div>
          </div>

          {sessionState === "SELECTING" && (
            <button
              onClick={handleReturnToPrepareScreen}
              className="px-5 py-2.5 rounded-xl bg-[#5B89A6] hover:bg-[#487594] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              🔄 Chụp lại bộ 8 ảnh mới
            </button>
          )}
        </div>

        {sessionState !== "SELECTING" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 bg-[#FAF8F2]/95 border border-[#D8E5EE] rounded-3xl p-5 shadow-md flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold text-[#487594] bg-[#E6F0F7] px-3 py-1 rounded-full">
                  {PHOTOBOOTH_FILTERS[activeFilterIdx].name}
                </span>
                {sessionState === "SHOOTING" && (
                  <span className="text-xs font-bold text-[#283E52] bg-[#F2ECE1] px-3.5 py-1 rounded-full border border-[#DEC89E]">
                    Đang chụp tấm {currentShotIdx + 1} / 8
                  </span>
                )}
              </div>

              <div className="relative w-full max-w-[540px] aspect-[4/3] rounded-2xl overflow-hidden border-4 border-white shadow-inner bg-[#E6F0F7]">
                <canvas
                  ref={previewCanvasRef}
                  width={640}
                  height={480}
                  className="w-full h-full object-cover block"
                />

                {sessionState === "SHOOTING" && (
                  <div className="absolute top-9 right-9 w-14 h-14 rounded-full bg-[#283E52]/85 backdrop-blur-md text-white flex flex-col items-center justify-center shadow-lg border-2 border-white/70">
                    <span className="text-xl font-bold leading-none">
                      {countdown}s
                    </span>
                    <span className="text-[9px] uppercase tracking-wider opacity-85">
                      Tấm {currentShotIdx + 1}/8
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

              <div className="mt-5 w-full flex flex-col items-center">
                {sessionState === "IDLE" ? (
                  <button
                    type="button"
                    disabled={!cameraReady}
                    onClick={handleStart8Shots}
                    className="px-8 py-4 rounded-2xl bg-[#5B89A6] hover:bg-[#487594] text-white font-semibold text-sm shadow-[0_10px_25px_rgba(91,137,166,0.35)] hover:scale-[1.02] transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>
                      📸 Bắt đầu chụp liên tiếp 8 bức ảnh (8 giây / tấm)
                    </span>
                  </button>
                ) : (
                  <div className="w-full max-w-md text-center">
                    <p className="text-xs font-semibold text-[#487594] mb-2">
                      ✨ Hãy căn chỉnh khuôn mặt vào giữa khung để vừa vặn với
                      Vương miện, Tai thỏ & Kính nhé!
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

            <div className="bg-[#FAF8F2]/95 border border-[#D8E5EE] rounded-3xl p-5 shadow-md">
              <h3 className="font-serif-vn text-base font-bold text-[#283E52] mb-1">
                8 Khung Filter Purikura Cầu Kỳ
              </h3>
              <p className="text-xs text-[#546E82] mb-4">
                {sessionState === "IDLE"
                  ? "Nhấp vào từng Filter để xem trước khung ren, họa tiết kẹo ngọt, Gấu/Thỏ/Mèo/Cún và phụ kiện:"
                  : "Hệ thống đang tự động chuyển lần lượt qua 8 khung Filter:"}
              </p>

              <div className="grid grid-cols-2 gap-2 mb-5">
                {PHOTOBOOTH_FILTERS.map((f, idx) => (
                  <button
                    key={f.id}
                    type="button"
                    disabled={sessionState === "SHOOTING"}
                    onClick={() => setActiveFilterIdx(idx)}
                    className={`p-2.5 rounded-xl text-left text-xs border transition-all ${
                      activeFilterIdx === idx
                        ? "bg-[#5B89A6] text-white border-[#5B89A6] font-semibold shadow-sm"
                        : "bg-white text-[#334B5E] border-[#D8E5EE] hover:border-[#7BA7C4] cursor-pointer"
                    }`}
                  >
                    <div className="truncate">{f.badge}</div>
                    <div className="text-[10px] opacity-80 truncate mt-0.5">
                      {f.name}
                    </div>
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
                        alt={p.filterName}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-start animate-fadeIn">
            <div className="lg:col-span-2 bg-[#FAF8F2]/95 border border-[#D8E5EE] rounded-3xl p-6 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-serif-vn text-xl font-bold text-[#283E52]">
                    Chọn 4 Bức Ảnh Ưng Ý Nhất ({selectedIndices.length} / 4)
                  </h2>
                  <p className="text-xs text-[#546E82]">
                    Nhấp vào từng ảnh để chọn hoặc bỏ chọn. Đủ 4 bức sẽ ghép
                    thành dải Photobooth!
                  </p>
                </div>

                <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#EAF4EC] text-[#2E6B40] border border-[#B7DFC2]">
                  {uploadStatus === "UPLOADING"
                    ? "☁️ Đang lưu 8 ảnh vào Google Drive..."
                    : "✓ Đã đồng bộ cả 8 ảnh về Google Drive"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
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
                        alt={photo.filterName}
                        className="w-full aspect-[4/3] object-cover block"
                      />
                      <div className="p-2 bg-white flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[#334B5E] truncate">
                          {photo.badge}
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

            <div className="bg-[#FAF8F2]/95 border border-[#D8E5EE] rounded-3xl p-6 shadow-md flex flex-col items-center">
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
                    🧸 Sweet Party Strip 🐰
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
// COMPONENT 3: TRANG CHÚC MỪNG 3D (DỜI BOX TIÊU ĐỀ XUỐNG & THÊM NÚT PHOTOBOOTH GÓC PHẢI)
// ============================================================================
function CelebrationPage({
  onOpenPhotobooth,
}: {
  onOpenPhotobooth: () => void;
}) {
  const [candleState, setCandleState] = useState<
    "UNLIT" | "LIT" | "BLOWING" | "BLOWN"
  >("UNLIT");
  const [hasWrittenWishOnce, setHasWrittenWishOnce] = useState(false);
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
    setHasWrittenWishOnce(true);
    setShowWishModal(false);
    triggerRealisticBlowOut(true);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-between select-none">
      <BalloonsBackground />

      <div className="fixed top-20 right-5 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={onOpenPhotobooth}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#FAF8F2]/95 hover:bg-white border border-[#B8D2E3] shadow-[0_10px_28px_rgba(40,62,82,0.14)] text-[#283E52] transition-all hover:scale-105 cursor-pointer"
        >
          <span className="w-8 h-8 rounded-xl bg-[#5B89A6] text-white flex items-center justify-center text-base shadow-sm">
            📸
          </span>
          <div className="text-left pr-1">
            <div className="text-xs font-bold leading-tight text-[#283E52]">
              Tiệm Photobooth
            </div>
            <div className="text-[10px] text-[#5B89A6] font-medium">
              Chụp 8 kiểu ảnh kỷ niệm →
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

      <header className="relative z-20 pt-16 sm:pt-20 px-4 text-center pointer-events-auto">
        <div className="inline-block bg-[#FAF8F2]/90 backdrop-blur-md border border-[#D8E5EE] px-7 py-3.5 rounded-full shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#487594] font-semibold">
            ✨ Happy Birthday To You ✨
          </p>
          <h1 className="font-serif-vn text-2xl sm:text-3xl font-bold text-[#283E52] mt-0.5">
            Tuổi Mới Bình Yên Giữa Trời Xanh
          </h1>
        </div>
        <p className="text-xs text-[#4A6275] mt-2 font-medium">
          (Dùng chuột hoặc chạm tay xoay 360° quanh chiếc bánh sinh nhật 3D)
        </p>
      </header>

      <div className="relative z-10 w-full h-[50vh] sm:h-[56vh] cursor-grab active:cursor-grabbing">
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
            maxDistance={6}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.05}
          />
        </Canvas>
      </div>

      <footer className="relative z-20 pb-8 px-4 flex flex-col items-center gap-3 pointer-events-auto">
        {candleState === "UNLIT" && (
          <button
            onClick={handleLightCandle}
            className="px-8 py-4 rounded-2xl bg-[#5B89A6] hover:bg-[#487594] text-white font-semibold text-sm shadow-[0_10px_28px_rgba(91,137,166,0.38)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>🕯️ Thắp nến sinh nhật</span>
          </button>
        )}

        {candleState === "LIT" && !showWishModal && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!hasWrittenWishOnce ? (
              <button
                onClick={() => setShowWishModal(true)}
                className="px-7 py-3.5 rounded-2xl bg-[#283E52] hover:bg-[#1D2F3F] text-white font-semibold text-xs shadow-lg transition-all cursor-pointer"
              >
                ✨ Viết điều ước & Thổi nến
              </button>
            ) : (
              <button
                onClick={() => triggerRealisticBlowOut(false)}
                className="px-8 py-3.5 rounded-2xl bg-[#5B89A6] hover:bg-[#487594] text-white font-semibold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2"
              >
                <span>🌬️ Thổi nến</span>
              </button>
            )}

            {hasWrittenWishOnce && (
              <button
                onClick={() => setIsLetterVisible((v) => !v)}
                className="px-6 py-3.5 rounded-2xl bg-[#FAF8F2]/95 hover:bg-white text-[#283E52] border border-[#D8E5EE] font-semibold text-xs shadow-sm transition-all cursor-pointer"
              >
                {isLetterVisible ? "Ẩn trang sách 📖" : "Mở lại trang sách 💌"}
              </button>
            )}
          </div>
        )}

        {candleState === "BLOWING" && (
          <div className="px-6 py-3 rounded-2xl bg-[#FAF8F2]/90 border border-[#D8E5EE] text-xs font-semibold text-[#487594] shadow-sm animate-pulse">
            🌬️ Làn gió biển đang thổi tắt ngọn nến...
          </div>
        )}

        {candleState === "BLOWN" && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsLetterVisible((prev) => !prev)}
              className="px-7 py-3.5 rounded-2xl bg-[#283E52] hover:bg-[#1D2F3F] text-white font-semibold text-xs shadow-lg transition-all cursor-pointer"
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
          <div className="bg-[#FAF8F2] border border-[#D8E5EE] rounded-3xl max-w-md w-full p-7 shadow-2xl">
            <div className="text-center mb-4">
              <span className="text-2xl">🕯️✨</span>
              <h3 className="font-serif-vn text-2xl font-bold text-[#283E52] mt-1">
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
                className="w-full p-4 rounded-2xl bg-white border border-[#D8E5EE] text-sm text-[#283E52] placeholder-[#95ACB8] focus:outline-none focus:border-[#5B89A6] resize-none"
                required
              />

              <div className="flex gap-2.5">
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
// COMPONENT GỐC QUẢN LÝ CHUYỂN MÀN HÌNH & THEME XANH BẦU TRỜI - ĐẠI DƯƠNG PASTEL
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

  const handleUnlockDigit = (index: number, digitValue: string) => {
    setUnlockedDigits((prev) => {
      const next = [...prev];
      next[index] = digitValue;
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F6F0] via-[#ECF3F8] to-[#F3EFE4] text-[#283E52] font-sans-vn antialiased selection:bg-[#CFE2EE] selection:text-[#1D3040] relative">
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

      <GentlePianoPlayer />

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
        <CelebrationPage onOpenPhotobooth={() => setScreen("PHOTOBOOTH")} />
      )}

      {screen === "PHOTOBOOTH" && (
        <PhotoboothPage onBackToCake={() => setScreen("CELEBRATION")} />
      )}
    </div>
  );
}
