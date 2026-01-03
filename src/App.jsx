import { useEffect, useRef, useState } from "react";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import * as tf from "@tensorflow/tfjs";
import confetti from "canvas-confetti";

const moves = ["Rock ✊", "Paper 🖐️", "Scissors ✌️"];

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detector, setDetector] = useState(null);
  const [playerMove, setPlayerMove] = useState("?");
  const [aiMove, setAiMove] = useState("?");
  const [result, setResult] = useState("Show your hand & play!");
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const setupCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    };
    setupCamera();
  }, []);

  useEffect(() => {
    const loadModel = async () => {
      await tf.ready();
      await tf.setBackend("webgl");
      const model = handPoseDetection.SupportedModels.MediaPipeHands;
      const detectorConfig = {
        runtime: "tfjs",
        modelType: "full",
        maxHands: 1,
      };
      const det = await handPoseDetection.createDetector(model, detectorConfig);
      setDetector(det);
    };
    loadModel();
  }, []);

  useEffect(() => {
    if (!detector || !canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext("2d");

    const detectAndDraw = async () => {
      const hands = await detector.estimateHands(videoRef.current);
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (hands.length > 0) {
        const keypoints = hands[0].keypoints;

        // Draw connections
        const connections = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [0, 5],
          [5, 6],
          [6, 7],
          [7, 8],
          [5, 9],
          [9, 10],
          [10, 11],
          [11, 12],
          [9, 13],
          [13, 14],
          [14, 15],
          [15, 16],
          [13, 17],
          [17, 18],
          [18, 19],
          [19, 20],
          [0, 17],
        ];
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 4;
        connections.forEach(([i, j]) => {
          ctx.beginPath();
          ctx.moveTo(keypoints[i].x, keypoints[i].y);
          ctx.lineTo(keypoints[j].x, keypoints[j].y);
          ctx.stroke();
        });

        // Draw glowing points
        keypoints.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
          ctx.fillStyle = "#00ffff";
          ctx.shadowBlur = 20;
          ctx.shadowColor = "#00ffff";
          ctx.fill();
        });
        ctx.shadowBlur = 0;
      }

      requestAnimationFrame(detectAndDraw);
    };
    detectAndDraw();
  }, [detector]);

  const classifyGesture = (keypoints) => {
    const wristY = keypoints[0].y;
    const tips = [
      keypoints[4],
      keypoints[8],
      keypoints[12],
      keypoints[16],
      keypoints[20],
    ];
    const extendedCount = tips.filter((tip) => tip.y < wristY - 50).length;

    if (extendedCount === 0) return "Rock ✊";
    if (extendedCount >= 4) return "Paper 🖐️";
    if (extendedCount === 2 && keypoints[12].y > keypoints[8].y - 20)
      return "Scissors ✌️";
    return null;
  };

  const playRound = async () => {
    if (!detector) return;
    setIsPlaying(true);
    const hands = await detector.estimateHands(videoRef.current);

    if (hands.length === 0) {
      setResult("No hand detected! 👀");
      setIsPlaying(false);
      return;
    }

    const gesture = classifyGesture(hands[0].keypoints);
    if (!gesture) {
      setResult("Unclear gesture – try a clear pose!");
      setIsPlaying(false);
      return;
    }

    const aiChoice = moves[Math.floor(Math.random() * 3)];
    setPlayerMove(gesture);
    setAiMove(aiChoice);

    if (gesture === aiChoice) {
      setResult("Tie! 🤝");
    } else if (
      (gesture.includes("Rock") && aiChoice.includes("Scissors")) ||
      (gesture.includes("Paper") && aiChoice.includes("Rock")) ||
      (gesture.includes("Scissors") && aiChoice.includes("Paper"))
    ) {
      setResult("YOU WIN! 🎉");
      setPlayerScore((prev) => prev + 1);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } else {
      setResult("AI Wins 😎");
      setAiScore((prev) => prev + 1);
    }

    setTimeout(() => setIsPlaying(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 animate-pulse" />

      <h1 className="text-6xl md:text-4xl font-black mb-10 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 drop-shadow-2xl">
        RPS AI Battle
      </h1>

      <div className="relative mb-10">
        <video
          ref={videoRef}
          className="w-full max-w-2xl h-auto rounded-3xl shadow-2xl border-4 border-cyan-400/50"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute top-0 left-0 rounded-3xl pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-10 shadow-2xl w-full max-w-2xl">
        <div className="grid grid-cols-2 gap-8 text-center mb-8">
          <div
            className={`transform transition-all duration-500 ${
              playerMove !== "?" ? "scale-125" : ""
            }`}
          >
            <p className="text-cyan-300 text-xl font-semibold mb-2">YOU</p>
            <p className="text-4xl">{playerMove}</p>
          </div>
          <div
            className={`transform transition-all duration-500 ${
              aiMove !== "?" ? "scale-125" : ""
            }`}
          >
            <p className="text-pink-300 text-xl font-semibold mb-2">AI</p>
            <p className="text-4xl">{aiMove}</p>
          </div>
        </div>

        <p className="text-4xl font-bold text-center my-8 text-white drop-shadow-lg">
          {result}
        </p>

        <div className="text-center text-2xl mb-10">
          <span className="text-cyan-400 font-bold">{playerScore}</span>
          <span className="mx-4 text-gray-400">–</span>
          <span className="text-pink-400 font-bold">{aiScore}</span>
        </div>

        <button
          onClick={playRound}
          disabled={isPlaying || !detector}
          className="relative w-full py-6 text-3xl font-black text-black bg-gradient-to-r from-cyan-400 to-pink-400 rounded-2xl overflow-hidden transform hover:scale-105 transition-all duration-300 disabled:opacity-60 shadow-2xl"
        >
          <span className="relative z-10">PLAY ROUND</span>
          <div className="absolute inset-0 bg-white/30 animate-ping" />
        </button>
      </div>

      <p className="mt-6 text-gray-400">
        Powered by TensorFlow.js Hand Pose Detection
      </p>
    </div>
  );
}

export default App;
