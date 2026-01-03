import { useEffect, useRef, useState, useCallback } from "react";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import * as tf from "@tensorflow/tfjs";
import confetti from "canvas-confetti";

const MOVES = ["Rock ✊", "Paper 🖐️", "Scissors ✌️"];

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detector, setDetector] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [playerMove, setPlayerMove] = useState("?");
  const [aiMove, setAiMove] = useState("?");
  const [result, setResult] = useState("Click PLAY to start!");
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);

  // Setup camera
  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        setResult("Camera access required!");
      }
    };
    setupCamera();
  }, []);

  // Load model
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        await tf.setBackend("webgl");
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig = {
          runtime: "tfjs",
          modelType: "full",
          maxHands: 1,
        };
        const det = await handPoseDetection.createDetector(
          model,
          detectorConfig
        );
        setDetector(det);
      } catch (err) {
        console.error("Model load failed:", err);
        setResult("AI model failed to load!");
      }
    };
    loadModel();
  }, []);

  // Countdown timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Capture pose when countdown reaches 0
  useEffect(() => {
    if (countdown !== 0 || !detector || !videoRef.current) return;

    capturePose();
  }, [countdown, detector]);

  const capturePose = useCallback(async () => {
    setResult("Analyzing your move...");
    const hands = await detector.estimateHands(videoRef.current);

    if (hands.length === 0) {
      setResult("No hand detected! Try again.");
      setTimeout(() => setCountdown(null), 1500);
      return;
    }

    const gesture = classifyGesture(hands[0].keypoints);
    if (!gesture) {
      setResult("Unclear gesture! Hold steady next time.");
      setTimeout(() => setCountdown(null), 1500);
      return;
    }

    setPlayerMove(gesture);
    setResult("AI is choosing...");

    // Dramatic reveal after 1.2s
    setTimeout(() => {
      const aiIdx = Math.floor(Math.random() * 3);
      const aiChoice = MOVES[aiIdx];
      setAiMove(aiChoice);

      let winnerText;
      if (gesture === aiChoice) {
        winnerText = "It's a TIE! 🤝";
      } else {
        const playerWins =
          (gesture === "Rock ✊" && aiChoice === "Scissors ✌️") ||
          (gesture === "Paper 🖐️" && aiChoice === "Rock ✊") ||
          (gesture === "Scissors ✌️" && aiChoice === "Paper 🖐️");

        if (playerWins) {
          winnerText = "YOU WIN! 🎉";
          setPlayerScore((prev) => prev + 1);
          confetti({
            particleCount: 200,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#00ffff", "#ff00ff", "#ffff00"],
          });
        } else {
          winnerText = "AI WINS! 😈";
          setAiScore((prev) => prev + 1);
        }
      }
      setResult(winnerText);
    }, 1200);

    // Reset countdown after reveal
    setTimeout(() => setCountdown(null), 4000);
  }, [detector]);

  const classifyGesture = (keypoints) => {
    if (!keypoints || keypoints.length < 21) return null;

    const wristY = keypoints[0].y;
    const indexTip = keypoints[8].y < wristY - 40;
    const middleTip = keypoints[12].y < wristY - 40;
    const ringTip = keypoints[16].y < wristY - 40;
    const pinkyTip = keypoints[20].y < wristY - 40;

    const extendedFingers =
      (indexTip ? 1 : 0) +
      (middleTip ? 1 : 0) +
      (ringTip ? 1 : 0) +
      (pinkyTip ? 1 : 0);

    if (extendedFingers === 0) return "Rock ✊";
    if (extendedFingers >= 3) return "Paper 🖐️";
    if (indexTip && middleTip && !ringTip && !pinkyTip) return "Scissors ✌️";

    return null;
  };

  // Continuous detection and drawing
  useEffect(() => {
    if (!detector || !videoRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    let animationFrameId;

    const detectAndDraw = async () => {
      const hands = await detector.estimateHands(videoRef.current);
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (hands.length > 0) {
        const keypoints = hands[0].keypoints;

        // Hand connections
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
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ffff";
        connections.forEach(([i, j]) => {
          ctx.beginPath();
          ctx.moveTo(keypoints[i].x, keypoints[i].y);
          ctx.lineTo(keypoints[j].x, keypoints[j].y);
          ctx.stroke();
        });
        ctx.shadowBlur = 0;

        // Glowing keypoints
        keypoints.forEach((p) => {
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
          gradient.addColorStop(0, "#00ffff");
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 12, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      animationFrameId = requestAnimationFrame(detectAndDraw);
    };

    detectAndDraw();

    return () => cancelAnimationFrame(animationFrameId);
  }, [detector]);

  const playRound = () => {
    if (countdown !== null || !detector) return;
    setPlayerMove("?");
    setAiMove("?");
    setResult("Get ready...");
    setCountdown(3);
  };

  const resetScores = () => {
    setPlayerScore(0);
    setAiScore(0);
    setCountdown(null);
    setPlayerMove("?");
    setAiMove("?");
    setResult("Scores reset! Play again.");
  };

  const isReady = !!detector && countdown === null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse slow" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,#00ffff20_0%,transparent_50%),radial-gradient(circle_at_80%_20%,#ff00ff20_0%,transparent_50%)] animate-[spin_20s_linear_infinite]" />

      <h1 className="text-4xl md:text-4xl font-black mb-12 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-400 drop-shadow-2xl animate-pulse">
        RPS AI Battle
      </h1>

      <div className="relative mb-12 max-w-2xl w-full aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full rounded-3xl shadow-2xl border-4 border-cyan-400/30 object-cover"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 rounded-3xl pointer-events-none"
          width={640}
          height={480}
        />
        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-xl rounded-3xl z-20">
            <div className="text-[clamp(12rem,35vw,28rem)] font-black drop-shadow-4xl animate-bounce">
              {countdown > 0 ? countdown : "GO!"}
            </div>
          </div>
        )}
      </div>

      <div className="backdrop-blur-3xl bg-white/10 border border-white/20 rounded-3xl p-12 shadow-2xl w-full max-w-2xl">
        <div className="grid grid-cols-2 gap-12 text-center mb-12">
          <div
            className={`transform transition-all duration-700 ${
              playerMove !== "?" ? "scale-110 animate-pulse" : ""
            }`}
          >
            <p className="text-cyan-300 text-2xl font-semibold mb-4 tracking-wide">
              YOUR MOVE
            </p>
            <p className="text-8xl md:text-4xl">{playerMove}</p>
          </div>
          <div
            className={`transform transition-all duration-700 delay-500 ${
              aiMove !== "?" ? "scale-110 animate-pulse" : ""
            }`}
          >
            <p className="text-pink-300 text-2xl font-semibold mb-4 tracking-wide">
              AI MOVE
            </p>
            <p className="text-8xl md:text-4xl">{aiMove}</p>
          </div>
        </div>

        <p className="text-5xl md:text-4xl font-black text-center my-12 text-white/90 drop-shadow-2xl">
          {result}
        </p>

        <div className="text-center text-4xl mb-12 font-mono tracking-wider">
          <span className="text-cyan-400">{playerScore}</span>
          <span className="mx-8 text-white/50">VS</span>
          <span className="text-pink-400">{aiScore}</span>
        </div>

        <div className="flex gap-4">
          <button
            onClick={playRound}
            disabled={!isReady}
            className="flex-1 py-8 px-8 text-3xl font-black text-black bg-gradient-to-r from-cyan-400 via-blue-400 to-pink-400 rounded-3xl overflow-hidden transform hover:scale-[1.02] active:scale-100 transition-all duration-300 shadow-2xl shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:shadow-2xl hover:shadow-pink-500/25"
          >
            {isReady ? "PLAY ROUND" : "LOADING AI..."}
          </button>
          <button
            onClick={resetScores}
            className="px-8 py-8 bg-white/20 hover:bg-white/30 border border-white/30 rounded-3xl text-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-sm"
          >
            Reset
          </button>
        </div>
      </div>

      <p className="mt-8 text-gray-400 text-lg backdrop-blur-sm px-6 py-3 bg-black/30 rounded-2xl border border-gray-600">
        Hold your pose steady during countdown! Powered by TensorFlow.js
      </p>
    </div>
  );
}

export default App;
