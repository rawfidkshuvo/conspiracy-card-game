import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
} from "firebase/firestore";
import {
  Shield,
  Sword,
  Coins,
  Crown,
  DoorOpen,
  Hand,
  RefreshCcw,
  Skull,
  CheckCircle,
  XCircle,
  RotateCcw,
  Trophy,
  BookOpen,
  X,
  LogOut,
  Info, // Added Info icon [cite: 4]
} from "lucide-react";

// --- Firebase Config & Init ---
const firebaseConfig = {
  apiKey: "AIzaSyBuqx_QQMMusEFu7BgE_Xnts82K6bKnqhQ",
  authDomain: "conspiracy-936b1.firebaseapp.com",
  projectId: "conspiracy-936b1",
  storageBucket: "conspiracy-936b1.firebasestorage.app",
  messagingSenderId: "74169733006",
  appId: "1:74169733006:web:9efd5d6032c7317e4d5edf",
  measurementId: "G-LZB3DTW0T0",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId =
  typeof __app_id !== "undefined" ? __app_id : "conspiracy-game-v6-fixed";

// --- Game Constants ---
const CARDS = {
  HERO: {
    name: "Hero",
    color: "bg-purple-600",
    icon: Crown,
    desc: "Grabs 3 coins. Blocks Export.",
  },
  ROBBER: {
    name: "Robber",
    color: "bg-blue-600",
    icon: Hand,
    desc: "Steal 2 coins. Blocks Stealing.",
  },
  GENIE: {
    name: "Genie",
    color: "bg-pink-600",
    icon: Shield,
    desc: "Blocks Stab.",
  },
  MONSTER: {
    name: "Monster",
    color: "bg-red-700",
    icon: Sword,
    desc: "Stab (Pay 3 to kill).",
  },
  RIDDLER: {
    name: "Riddler",
    color: "bg-emerald-600",
    icon: RefreshCcw,
    desc: "Exchange cards. Blocks Stealing.",
  },
};

const DECK_TEMPLATE = [
  ...Array(3).fill("HERO"),
  ...Array(3).fill("ROBBER"),
  ...Array(3).fill("GENIE"),
  ...Array(3).fill("MONSTER"),
  ...Array(3).fill("RIDDLER"),
];

const ACTIONS = {
  EARN: {
    name: "Earn",
    cost: 0,
    income: 1,
    blockable: false,
    challengeable: false,
  },
  EXPORT: {
    name: "Export",
    cost: 0,
    income: 2,
    blockable: true,
    challengeable: false,
    blockedBy: ["HERO"],
  },
  TAX: {
    name: "Tax",
    cost: 0,
    income: 3,
    blockable: false,
    challengeable: true,
    claim: "HERO",
  },
  STEAL: {
    name: "Steal",
    cost: 0,
    income: 0,
    blockable: true,
    challengeable: true,
    claim: "ROBBER",
    blockedBy: ["ROBBER", "RIDDLER"],
  },
  STAB: {
    name: "Stab",
    cost: 3,
    income: 0,
    blockable: true,
    challengeable: true,
    claim: "MONSTER",
    blockedBy: ["GENIE"],
  },
  EXCHANGE: {
    name: "Exchange",
    cost: 0,
    income: 0,
    blockable: false,
    challengeable: true,
    claim: "RIDDLER",
  },
  KILL: {
    name: "Kill",
    cost: 7,
    income: 0,
    blockable: false,
    challengeable: false,
  },
};

// --- Helper Functions ---
const shuffle = (array) => {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
};

// --- Sub-Components ---
const RulesModal = ({ onClose }) => {
  const [tab, setTab] = useState("basics");

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-lg transition-all ${
        tab === id
          ? "bg-purple-600 text-white shadow-lg"
          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
      }`}
    >
      {Icon && <Icon size={16} />} {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="text-purple-400" /> How to Play
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white"
          >
            <X />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 bg-gray-900 border-b border-gray-800 overflow-x-auto">
          <TabButton id="basics" label="The Basics" icon={Coins} />
          <TabButton id="cards" label="Characters" icon={Crown} />
          <TabButton id="actions" label="Actions" icon={Sword} />
          <TabButton id="challenges" label="Bluffing" icon={XCircle} />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 text-gray-300 space-y-6">
          {tab === "basics" && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-xl font-bold text-yellow-400">
                Goal: Be the Last One Standing
              </h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Each player starts with <strong>2 Cards</strong> (Influences)
                  and <strong>2 Coins</strong>.
                </li>
                <li>
                  Your cards are kept face-down. No one sees them but you.
                </li>
                <li>
                  If you lose a life (from a Coup, Assassination, or failed
                  Challenge), you must flip one card face-up.
                </li>
                <li>
                  If both your cards are face-up, you are{" "}
                  <strong>Eliminated</strong>.
                </li>
                <li>The last player with at least one face-down card wins.</li>
              </ul>
            </div>
          )}

          {tab === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
              {Object.entries(CARDS).map(([key, card]) => (
                <div
                  key={key}
                  className={`p-4 rounded-lg border border-gray-700 bg-gray-800 flex items-start gap-3`}
                >
                  <div className={`p-3 rounded-lg ${card.color} text-white`}>
                    <card.icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{card.name}</h4>
                    <p className="text-sm text-gray-400">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "actions" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-gray-800 rounded-lg border-l-4 border-green-500">
                <h4 className="font-bold text-white">General Actions (Safe)</h4>
                <p className="text-sm">
                  <strong>Earn:</strong> Take 1 coin. (Cannot be blocked).
                </p>
                <p className="text-sm">
                  <strong>Kill (Coup):</strong> Pay 7 coins. Choose a player to
                  lose a life immediately. (Unblockable).
                </p>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg border-l-4 border-yellow-500">
                <h4 className="font-bold text-white">
                  Character Actions (Blockable/Challengeable)
                </h4>
                <p className="text-sm mb-2">
                  You can claim to have a character to use their action:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>
                    <strong>Tax (Hero):</strong> Take 3 coins.
                  </li>
                  <li>
                    <strong>Steal (Robber):</strong> Take 2 coins from another
                    player.
                  </li>
                  <li>
                    <strong>Stab (Monster):</strong> Pay 3 coins to make someone
                    lose a life.
                  </li>
                  <li>
                    <strong>Exchange (Riddler):</strong> Draw 2 cards, return 2
                    cards.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {tab === "challenges" && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-xl font-bold text-red-400 mb-2">
                  The Art of Lying
                </h3>
                <p>
                  You don't need the card to do the action! If you don't have a{" "}
                  <strong>Hero</strong>, you can still say "I am using Tax" to
                  get 3 coins. This is a bluff.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/50">
                  <h4 className="font-bold text-white mb-2">Challenging</h4>
                  <p className="text-sm">
                    If an opponent thinks you are lying, they can{" "}
                    <strong>CHALLENGE</strong> you.
                  </p>
                  <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
                    <li>
                      If you <strong>have</strong> the card: You show it. The
                      challenger loses a life. You shuffle your card and draw a
                      new one.
                    </li>
                    <li>
                      If you <strong>don't</strong> have the card: You lose a
                      life.
                    </li>
                  </ul>
                </div>
                <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/50">
                  <h4 className="font-bold text-white mb-2">Blocking</h4>
                  <p className="text-sm">
                    You can claim a character to block attacks.
                  </p>
                  <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
                    <li>
                      <strong>Hero</strong> blocks Foreign Aid.
                    </li>
                    <li>
                      <strong>Genie</strong> blocks Stab (Assassination).
                    </li>
                    <li>
                      <strong>Robber/Riddler</strong> blocks Steal.
                    </li>
                  </ul>
                  <p className="text-xs mt-2 text-blue-300">
                    Blocks can also be Challenged!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LeaveConfirmModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-sm w-full text-center shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-2">Leave Game?</h3>
      <p className="text-gray-400 mb-6 text-sm">
        Do you really want to leave? You will be removed from the current game.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCancel}
          className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded font-bold"
        >
          No, Stay
        </button>
        <button
          onClick={onConfirm}
          className="bg-red-600 hover:bg-red-500 text-white py-3 rounded font-bold"
        >
          Yes, Leave
        </button>
      </div>
    </div>
  </div>
);

const ConspiracyLogo = () => (
  <div className="flex items-center justify-center gap-1 opacity-60 mt-auto pb-2 pt-2">
    <span className="text-[10px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 uppercase">
      CONSPIRACY
    </span>
    <span className="text-[8px] text-gray-500">©</span>
  </div>
);

export default function ConspiracyGame() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("menu");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [roomId, setRoomId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exchangeSelection, setExchangeSelection] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showLogHistory, setShowLogHistory] = useState(false); // New State for Log Modal

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!roomId || !user) return;
    const roomRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "rooms",
      roomId
    );
    const unsubscribe = onSnapshot(
      roomRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGameState({ id: docSnap.id, ...data });
          if (data.status === "playing" || data.status === "finished")
            setView("game");
          else setView("lobby");
        } else {
          setRoomId(null);
          setView("menu");
          setError("Room closed or does not exist.");
        }
      },
      (err) => console.error(err)
    );
    return () => unsubscribe();
  }, [roomId, user]);

  const createRoom = async () => {
    if (!user || !playerName.trim()) return setError("Enter a nickname first.");
    setLoading(true);
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomData = {
      hostId: user.uid,
      password: createPassword,
      maxPlayers: parseInt(maxPlayers),
      players: [
        {
          id: user.uid,
          name: playerName,
          coins: 2,
          cards: [],
          isEliminated: false,
          ready: true,
        },
      ],
      status: "lobby",
      turnIndex: 0,
      deck: [],
      logs: [],
      turnState: "IDLE",
      currentAction: null,
    };
    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", newRoomId),
        roomData
      );
      setRoomId(newRoomId);
    } catch (e) {
      setError("Failed to create room.");
    }
    setLoading(false);
  };

  const joinRoom = async () => {
    if (!user || !roomCode || !playerName.trim())
      return setError("Enter nickname & room code.");
    setLoading(true);
    try {
      const roomRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "rooms",
        roomCode
      );
      const snap = await getDoc(roomRef);
      if (!snap.exists()) throw new Error("Room not found.");
      const data = snap.data();
      if (data.password && data.password !== joinPassword)
        throw new Error("Wrong password.");
      if (data.players.length >= data.maxPlayers) throw new Error("Room full.");
      if (data.status !== "lobby") throw new Error("Game started.");
      const exists = data.players.find((p) => p.id === user.uid);
      if (!exists) {
        await updateDoc(roomRef, {
          players: arrayUnion({
            id: user.uid,
            name: playerName,
            coins: 2,
            cards: [],
            isEliminated: false,
            ready: true,
          }),
        });
      }
      setRoomId(roomCode);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleLeaveRoom = async () => {
    if (!roomId || !user || !gameState) return;
    const updatedPlayers = gameState.players.filter((p) => p.id !== user.uid);
    let status = gameState.status;
    if (status === "playing" && updatedPlayers.length < 2) {
      status = "finished";
    }

    const myIndex = gameState.players.findIndex((p) => p.id === user.uid);
    let newTurnIndex = gameState.turnIndex;
    if (myIndex < gameState.turnIndex) {
      newTurnIndex = Math.max(0, newTurnIndex - 1);
    }
    if (newTurnIndex >= updatedPlayers.length) {
      newTurnIndex = 0;
    }

    const logs = [...(gameState.logs || [])];
    const me = gameState.players.find((p) => p.id === user.uid);
    if (me) {
      logs.push({ text: `${me.name} left the game.`, type: "danger" });
    }
    if (status === "finished" && gameState.status === "playing") {
      logs.push({ text: "Not enough players. Game Over.", type: "neutral" });
    }

    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        {
          players: updatedPlayers,
          status: status,
          turnIndex: newTurnIndex,
          logs: logs,
        }
      );
    } catch (e) {
      console.error("Error leaving room", e);
    }

    setRoomId(null);
    setView("menu");
    setShowLeaveConfirm(false);
  };

  const startGame = async () => {
    if (!gameState || gameState.hostId !== user.uid) return;
    if (gameState.players.length < 2) return setError("Need 2+ players.");

    const deck = shuffle([...DECK_TEMPLATE, ...DECK_TEMPLATE]);
    const players = gameState.players.map((p) => ({
      ...p,
      coins: 2,
      cards: [
        { type: deck.pop(), flipped: false },
        { type: deck.pop(), flipped: false },
      ],
      isEliminated: false,
    }));
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      {
        status: "playing",
        deck,
        players,
        turnIndex: 0,
        turnState: "IDLE",
        logs: arrayUnion({ text: "Game Started!", type: "info" }),
      }
    );
  };

  const hardResetRoom = async () => {
    if (!gameState || gameState.hostId !== user.uid) return;
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      {
        status: "lobby",
        turnState: "IDLE",
        currentAction: null,
        logs: [],
        players: gameState.players.map((p) => ({
          ...p,
          cards: [],
          coins: 2,
          isEliminated: false,
        })),
      }
    );
  };

  const restartGame = async () => {
    if (!gameState || gameState.hostId !== user.uid) return;
    const deck = shuffle([...DECK_TEMPLATE, ...DECK_TEMPLATE]);
    const players = gameState.players.map((p) => ({
      ...p,
      coins: 2,
      cards: [
        { type: deck.pop(), flipped: false },
        { type: deck.pop(), flipped: false },
      ],
      isEliminated: false,
    }));
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      {
        status: "playing",
        deck,
        players,
        turnIndex: 0,
        turnState: "IDLE",
        logs: [{ text: "Game Restarted!", type: "info" }],
        currentAction: null,
      }
    );
  };

  // --- Game Logic ---
  const getActivePlayers = () =>
    gameState?.players.filter((p) => !p.isEliminated) || [];
  const getCurrentPlayer = () => gameState?.players[gameState.turnIndex];
  const isMyTurn = () => getCurrentPlayer()?.id === user.uid;
  const checkGameOver = (players) => {
    const alive = players.filter((p) => !p.isEliminated);
    if (alive.length <= 1) return true;
    return false;
  };

  const nextTurn = async (currentRoomState) => {
    let nextIndex =
      (currentRoomState.turnIndex + 1) % currentRoomState.players.length;
    let checks = 0;
    while (currentRoomState.players[nextIndex].isEliminated && checks < 10) {
      nextIndex = (nextIndex + 1) % currentRoomState.players.length;
      checks++;
    }

    if (checks >= 10) {
      nextIndex = currentRoomState.players.findIndex((p) => !p.isEliminated);
    }

    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      {
        turnIndex: nextIndex,
        turnState: "IDLE",
        currentAction: null,
        players: currentRoomState.players,
        loseReason: null, // Reset reason on new turn
      }
    );
  };

  const handleAction = async (actionKey, targetId = null) => {
    if (!isMyTurn()) return;
    const player = getCurrentPlayer();
    const action = ACTIONS[actionKey];

    if (player.coins < action.cost) return;
    if (player.coins >= 10 && actionKey !== "KILL")
      return alert("Must use Kill!");
    const actionPayload = {
      type: actionKey,
      actorId: user.uid,
      targetId: targetId,
      status: "PENDING",
      votes: [],
      actionPending: false,
    };
    // Immediate actions
    if (actionKey === "EARN") {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.turnIndex].coins += 1;
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        {
          players: updatedPlayers,
          logs: arrayUnion({
            text: `${player.name} takes Income (+1 coin).`,
            type: "neutral",
          }),
        }
      );
      await nextTurn({ ...gameState, players: updatedPlayers });
      return;
    }

    // Coup is special: Immediate cost, unblockable, unchallengeable
    if (actionKey === "KILL") {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.turnIndex].coins -= 7;
      const targetName = gameState.players.find((p) => p.id === targetId).name;
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        {
          players: updatedPlayers,
          turnState: "LOSE_CARD",
          currentAction: actionPayload,
          loserId: targetId,
          loseReason: "kill", // Added
          logs: arrayUnion({
            text: `${player.name} killed ${targetName} (-7 coins).`,
            type: "danger",
          }),
        }
      );
      return;
    }

    // All other actions go to voting phase
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      {
        turnState: "ACTION_PENDING",
        currentAction: actionPayload,
      }
    );
  };

  const handlePass = async () => {
    // --- BUG FIX START ---
    // Strictly ensure we are in voting mode. If a Challenge or Block happened, STOP.
    if (gameState.turnState !== "ACTION_PENDING") return;
    // --- BUG FIX END ---

    if (!gameState.currentAction) return;
    if (gameState.currentAction.votes.includes(user.uid)) return;

    const newVotes = [...gameState.currentAction.votes, user.uid];
    const livingPlayers = getActivePlayers().length;

    // Everyone else has passed?
    if (newVotes.length >= livingPlayers - 1) {
      await confirmAction();
    } else {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        {
          "currentAction.votes": newVotes,
        }
      );
    }
  };

  // Find and replace the entire 'confirmAction' function
  const confirmAction = async () => {
    // --- FIX: GUARD CLAUSE ---
    // If the state has changed (e.g., someone clicked Challenge or Block),
    // STOP immediately. Do not award coins.
    if (gameState.turnState !== "ACTION_PENDING") return;

    const action = ACTIONS[gameState.currentAction.type];
    const actorIndex = gameState.players.findIndex(
      (p) => p.id === gameState.currentAction.actorId
    );
    const updatedPlayers = [...gameState.players];
    let logMsg = `${updatedPlayers[actorIndex].name} performs ${action.name}`;

    // Apply effects
    if (gameState.currentAction.type === "EXPORT") {
      updatedPlayers[actorIndex].coins += 2;
      logMsg += " (+2 coins).";
    } else if (gameState.currentAction.type === "TAX") {
      updatedPlayers[actorIndex].coins += 3;
      logMsg += " (+3 coins).";
    } else if (gameState.currentAction.type === "STEAL") {
      const targetIndex = updatedPlayers.findIndex(
        (p) => p.id === gameState.currentAction.targetId
      );
      const stolen = Math.min(updatedPlayers[targetIndex].coins, 2);
      updatedPlayers[targetIndex].coins -= stolen;
      updatedPlayers[actorIndex].coins += stolen;
      logMsg += ` on ${updatedPlayers[targetIndex].name} (stole ${stolen}).`;
    } else if (gameState.currentAction.type === "STAB") {
      updatedPlayers[actorIndex].coins -= 3;
      // Pay for assassination
      const targetName = gameState.players.find(
        (p) => p.id === gameState.currentAction.targetId
      ).name;
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        {
          players: updatedPlayers,
          turnState: "LOSE_CARD",
          loserId: gameState.currentAction.targetId,
          loseReason: "stab",
          logs: arrayUnion({
            text: `${updatedPlayers[actorIndex].name} assassinates ${targetName} (-3 coins).`,
            type: "danger",
          }),
        }
      );
      return;
    } else if (gameState.currentAction.type === "EXCHANGE") {
      const deck = [...gameState.deck];
      if (deck.length < 2) {
        deck.push(...DECK_TEMPLATE);
      }
      const newCards = [deck.pop(), deck.pop()];
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        {
          turnState: "EXCHANGE_SELECT",
          deck,
          tempCards: newCards,
          logs: arrayUnion({
            text: `${updatedPlayers[actorIndex].name} exchanges cards.`,
            type: "neutral",
          }),
        }
      );
      return;
    }

    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      {
        players: updatedPlayers,
        logs: arrayUnion({ text: logMsg, type: "success" }),
      }
    );
    await nextTurn({ ...gameState, players: updatedPlayers });
  };

  const handleBlock = async (blockerId, claimCard) => {
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      {
        turnState: "BLOCK_PENDING",
        currentAction: {
          ...gameState.currentAction,
          blockerId,
          blockClaim: claimCard,
          votes: [],
        },
        logs: arrayUnion({
          text: `${
            gameState.players.find((p) => p.id === blockerId).name
          } blocks with ${claimCard}!`,
          type: "warning",
        }),
      }
    );
  };

  const handleAcceptBlock = async () => {
    if (gameState.turnState !== "BLOCK_PENDING") return;
    if (gameState.currentAction.votes.includes(user.uid)) return;
    const newVotes = [...gameState.currentAction.votes, user.uid];
    const livingPlayers = getActivePlayers().length;

    if (newVotes.length >= livingPlayers - 1) {
      // BLOCK ACCEPTED
      const act = gameState.currentAction;
      let updatedPlayers = [...gameState.players];

      if (act.type === "STAB") {
        const actorIdx = updatedPlayers.findIndex((p) => p.id === act.actorId);
        updatedPlayers[actorIdx].coins = Math.max(
          0,
          updatedPlayers[actorIdx].coins - 3
        );
      }

      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        {
          players: updatedPlayers,
          logs: arrayUnion({
            text: "Block Accepted. Action Failed.",
            type: "info",
          }),
        }
      );

      await nextTurn({ ...gameState, players: updatedPlayers });
    } else {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        {
          "currentAction.votes": newVotes,
        }
      );
    }
  };

  const handleChallenge = async (challengerId) => {
    const isChallengingBlock = gameState.turnState === "BLOCK_PENDING";
    const accusedId = isChallengingBlock
      ? gameState.currentAction.blockerId
      : gameState.currentAction.actorId;
    const claim = isChallengingBlock
      ? gameState.currentAction.blockClaim
      : ACTIONS[gameState.currentAction.type].claim;
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      {
        turnState: "CHALLENGE_RESOLVE",
        challengerId,
        accusedId,
        challengedCard: claim,
      }
    );
  };

  // Find and replace the entire 'handleSurrender' function
  // Replace the entire handleSurrender function
  const handleSurrender = async () => {
    const updatedPlayers = [...gameState.players];
    const me = updatedPlayers.find((p) => p.id === user.uid);
    const myIdx = updatedPlayers.findIndex((p) => p.id === user.uid);
    const activeCards = me.cards
      .map((c, i) => ({ ...c, index: i }))
      .filter((c) => !c.flipped);

    let logs = [{ text: `${me.name} surrendered.`, type: "danger" }];
    let actionPending = false;
    let nextState = "IDLE";
    let nextLoserId = null;
    let nextLoseReason = null;

    // Check if the person surrendering is the Blocker
    const isBlockerSurrendering =
      gameState.currentAction.blockerId === user.uid;

    if (isBlockerSurrendering) {
      // === BLOCKER GAVE UP -> ACTION SUCCEEDS ===
      const act = gameState.currentAction;
      const actorIdx = updatedPlayers.findIndex((p) => p.id === act.actorId);

      if (act.type === "STEAL") {
        const targetIdx = updatedPlayers.findIndex(
          (p) => p.id === act.targetId
        );
        const stolen = Math.min(updatedPlayers[targetIdx].coins, 2);
        updatedPlayers[targetIdx].coins -= stolen;
        updatedPlayers[actorIdx].coins += stolen;
        logs.push({ text: "Block failed. Steal succeeds!", type: "danger" });
      } else if (act.type === "EXPORT") {
        updatedPlayers[actorIdx].coins += 2;
        logs.push({
          text: "Block failed. Export succeeds (+2 coins)!",
          type: "success",
        });
      } else if (act.type === "TAX") {
        // Rare case if tax is blocked?
        updatedPlayers[actorIdx].coins += 3;
        logs.push({ text: "Block failed. Tax succeeds!", type: "success" });
      } else if (act.type === "STAB") {
        updatedPlayers[actorIdx].coins -= 3;
        nextState = "LOSE_CARD";
        nextLoserId = act.targetId;
        nextLoseReason = "stab";
        logs.push({ text: "Block failed. Stab succeeds!", type: "danger" });
      } else if (act.type === "EXCHANGE") {
        actionPending = true;
        logs.push({ text: "Block failed. Exchange proceeds.", type: "info" });
      }
    } else {
      // === ACTOR GAVE UP -> ACTION FAILS ===
      logs.push({ text: "Action caught! Turn ends.", type: "info" });
    }

    // Lose Life Logic
    if (activeCards.length === 1) {
      updatedPlayers[myIdx].cards[activeCards[0].index].flipped = true;
      updatedPlayers[myIdx].isEliminated = true;
    } else {
      nextState = "LOSE_CARD";
      nextLoserId = user.uid;
      nextLoseReason = "challenge";
    }

    // Update Database
    const isGameOver = checkGameOver(updatedPlayers);
    let updateData = {
      players: updatedPlayers,
      logs: arrayUnion(...logs),
      "currentAction.actionPending": actionPending,
    };

    if (isGameOver) updateData.status = "finished";
    else if (nextState === "LOSE_CARD") {
      updateData.turnState = "LOSE_CARD";
      updateData.loserId = nextLoserId;
      if (nextLoseReason) updateData.loseReason = nextLoseReason;
    }

    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      updateData
    );

    if (isGameOver || nextState === "LOSE_CARD") return;

    if (actionPending && gameState.currentAction.type === "EXCHANGE") {
      const deck = [...gameState.deck];
      const newCards = [deck.pop(), deck.pop()];
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        {
          turnState: "EXCHANGE_SELECT",
          deck,
          tempCards: newCards,
          "currentAction.actionPending": false,
        }
      );
    } else {
      await nextTurn({ ...gameState, players: updatedPlayers });
    }
  };

  // Find and replace the entire 'resolveChallenge' function
  //
  // Replace the entire resolveChallenge function
  const resolveChallenge = async (cardIndex) => {
    const accusedPlayer = gameState.players.find((p) => p.id === user.uid);
    const revealedCard = accusedPlayer.cards[cardIndex];
    const requiredCard = gameState.challengedCard;
    const hasCard = revealedCard.type === requiredCard;

    let updatedPlayers = [...gameState.players];
    let newDeck = [...gameState.deck];
    let nextStepLogs = [];
    let nextState = "IDLE";
    let nextLoserId = null;
    let nextLoseReason = null;
    let actionPending = false;

    // --- 1. DETERMINE CONTEXT ---
    // If the person accused is the Blocker, we are resolving a Block Challenge.
    // If the person accused is the Actor, we are resolving an Action Challenge.
    // This fixes the "Reverse Coin" bug.
    const isBlockChallenge =
      gameState.currentAction.blockerId &&
      gameState.currentAction.blockerId === gameState.accusedId;

    // --- 2. HANDLE CARD REVEAL (Winner/Loser) ---
    if (hasCard) {
      // --- CHALLENGE FAILED (Accused told truth) ---
      nextStepLogs.push({
        text: `Challenge Failed! ${accusedPlayer.name} had ${requiredCard}.`,
        type: "success",
      });

      // Shuffle card back into deck and draw a new one
      newDeck.push(revealedCard.type);
      newDeck = shuffle(newDeck);
      const pIdx = updatedPlayers.findIndex((p) => p.id === user.uid);
      updatedPlayers[pIdx].cards[cardIndex] = {
        type: newDeck.pop(),
        flipped: false,
      };

      // Challenger loses a life
      nextState = "LOSE_CARD";
      nextLoserId = gameState.challengerId;
      nextLoseReason = "challenge";
    } else {
      // --- CHALLENGE WON (Accused lied) ---
      nextStepLogs.push({
        text: `Challenge Won! ${accusedPlayer.name} caught lying!`,
        type: "danger",
      });

      // Accused loses a life
      const pIdx = updatedPlayers.findIndex((p) => p.id === user.uid);
      updatedPlayers[pIdx].cards[cardIndex].flipped = true;

      if (updatedPlayers[pIdx].cards.every((c) => c.flipped)) {
        updatedPlayers[pIdx].isEliminated = true;
      }
    }

    // --- 3. HANDLE ACTION CONSEQUENCES (Coins/Effect) ---
    const act = gameState.currentAction;
    const aIdx = updatedPlayers.findIndex((p) => p.id === act.actorId);

    if (isBlockChallenge) {
      // === WE ARE RESOLVING A BLOCK ===
      if (hasCard) {
        // Scenario: Blocker had the card (Block Valid).
        // Result: BLOCK SUCCEEDS. Action FAILS. Actor gets NOTHING.
        nextStepLogs.push({
          text: "Block Valid. Action stopped.",
          type: "warning",
        });

        // Special Case: If it was a STAB, the Assassin effectively wasted the turn.
        // (We don't refund the coins here usually, or we assume they weren't spent yet.
        // Current logic assumes they weren't spent).
      } else {
        // Scenario: Blocker Lied (Block Invalid).
        // Result: BLOCK FAILS. Action SUCCEEDS. Actor GETS COINS/EFFECT.

        if (act.type === "TAX") {
          updatedPlayers[aIdx].coins += 3;
          nextStepLogs.push({
            text: "Block Invalid: Tax succeeds (+3).",
            type: "success",
          });
        }
        if (act.type === "EXPORT") {
          updatedPlayers[aIdx].coins += 2;
          nextStepLogs.push({
            text: "Block Invalid: Export succeeds (+2).",
            type: "success",
          });
        }
        if (act.type === "STEAL") {
          const tIdx = updatedPlayers.findIndex((p) => p.id === act.targetId);
          const s = Math.min(updatedPlayers[tIdx].coins, 2);
          updatedPlayers[tIdx].coins -= s;
          updatedPlayers[aIdx].coins += s;
          nextStepLogs.push({
            text: `Block Invalid: Steal succeeds (+${s}).`,
            type: "success",
          });
        }
        if (act.type === "STAB") {
          updatedPlayers[aIdx].coins -= 3;
          // IMPORTANT: Trigger the Stab effect logic after the challenge penalty
          actionPending = true;
          nextStepLogs.push({
            text: "Block Invalid: Stab succeeds.",
            type: "danger",
          });
        }
        if (act.type === "EXCHANGE") {
          actionPending = true;
        }
      }
    } else {
      // === WE ARE RESOLVING AN ACTION (e.g. Tax/Steal challenged directly) ===
      if (hasCard) {
        // Scenario: Actor had the card.
        // Result: ACTION SUCCEEDS. Actor GETS COINS/EFFECT.

        if (act.type === "TAX") {
          updatedPlayers[aIdx].coins += 3;
          nextStepLogs.push({
            text: "Challenge Failed: Tax proceeds (+3).",
            type: "success",
          });
        }
        if (act.type === "EXPORT") {
          updatedPlayers[aIdx].coins += 2;
          nextStepLogs.push({
            text: "Challenge Failed: Export proceeds (+2).",
            type: "success",
          });
        }
        if (act.type === "STEAL") {
          const tIdx = updatedPlayers.findIndex((p) => p.id === act.targetId);
          const s = Math.min(updatedPlayers[tIdx].coins, 2);
          updatedPlayers[tIdx].coins -= s;
          updatedPlayers[aIdx].coins += s;
          nextStepLogs.push({
            text: `Challenge Failed: Steal proceeds (+${s}).`,
            type: "success",
          });
        }
        if (act.type === "STAB") {
          updatedPlayers[aIdx].coins -= 3;
          // IMPORTANT: Trigger the Stab effect logic after the challenge penalty
          actionPending = true;
          nextStepLogs.push({
            text: "Challenge Failed: Stab proceeds.",
            type: "danger",
          });
        }
        if (act.type === "EXCHANGE") {
          actionPending = true;
        }
      } else {
        // Scenario: Actor Lied.
        // Result: ACTION FAILS. Actor gets NOTHING.
        nextStepLogs.push({
          text: "Action Invalid due to bluff.",
          type: "warning",
        });
      }
    }

    // --- 4. SAVE TO DB ---
    const isGameOver = checkGameOver(updatedPlayers);
    let updateData = {
      players: updatedPlayers,
      deck: newDeck,
      logs: arrayUnion(...nextStepLogs),
      "currentAction.actionPending": actionPending,
    };

    if (isGameOver) {
      updateData.status = "finished";
    } else if (nextState === "LOSE_CARD") {
      updateData.turnState = "LOSE_CARD";
      updateData.loserId = nextLoserId;
      if (nextLoseReason) updateData.loseReason = nextLoseReason;
    }

    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      updateData
    );

    if (isGameOver || nextState === "LOSE_CARD") return;

    // Handle Exchange Continuation (Immediate)
    if (actionPending && gameState.currentAction.type === "EXCHANGE") {
      const d = [...newDeck];
      const nc = [d.pop(), d.pop()];
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        {
          turnState: "EXCHANGE_SELECT",
          deck: d,
          tempCards: nc,
          "currentAction.actionPending": false,
        }
      );
    } else {
      await nextTurn({ ...gameState, players: updatedPlayers });
    }
  };
  const loseLife = async (cardIndex) => {
    if (gameState.loserId !== user.uid) return;
    const updatedPlayers = [...gameState.players];
    const pIdx = updatedPlayers.findIndex((p) => p.id === user.uid);

    if (updatedPlayers[pIdx].cards[cardIndex].flipped) return;

    // 1. Flip the card (Pay the Life)
    updatedPlayers[pIdx].cards[cardIndex].flipped = true;
    const isEliminated = updatedPlayers[pIdx].cards.every((c) => c.flipped);
    if (isEliminated) updatedPlayers[pIdx].isEliminated = true;

    const logEntries = [
      {
        text: `${updatedPlayers[pIdx].name} lost a life.`,
        type: "danger",
      },
    ];
    if (isEliminated) {
      logEntries.push({
        text: `${updatedPlayers[pIdx].name} is ELIMINATED!`,
        type: "danger",
      });
    }

    const isGameOver = checkGameOver(updatedPlayers);
    let updateData = {
      players: updatedPlayers,
      logs: arrayUnion(...logEntries),
    };

    if (isGameOver) {
      const alive = updatedPlayers.filter((p) => !p.isEliminated);
      updateData.status = "finished";
      updateData.logs = arrayUnion({
        text: `Game Over! ${alive[0]?.name} Wins!`,
        type: "success",
      });
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        updateData
      );
      return;
    }

    // 2. CHECK FOR PENDING ACTIONS (Exchange OR Double-Kill Stab)
    if (gameState.currentAction?.actionPending) {
      // --- CASE A: EXCHANGE CONTINUES ---
      if (gameState.currentAction.type === "EXCHANGE") {
        await updateDoc(
          doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
          updateData
        ); // Save the life loss first

        const deck = [...gameState.deck];
        const newCards = [deck.pop(), deck.pop()];
        await updateDoc(
          doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
          {
            turnState: "EXCHANGE_SELECT",
            deck,
            tempCards: newCards,
            "currentAction.actionPending": false,
          }
        );
        return;
      }

      // --- CASE B: STAB PROCEEDS (DOUBLE KILL LOGIC) ---
      if (gameState.currentAction.type === "STAB") {
        const targetId = gameState.currentAction.targetId;
        const targetPlayer = updatedPlayers.find((p) => p.id === targetId);

        // Only enforce the 2nd kill if the target is still alive
        if (targetPlayer && !targetPlayer.isEliminated) {
          // Add a log explaining what's happening
          updateData.logs = arrayUnion(...logEntries, {
            text: "Stab still lands! Target must lose another life.",
            type: "danger",
          });

          // Set state to make the Target lose a life immediately
          updateData.turnState = "LOSE_CARD";
          updateData.loserId = targetId;
          updateData.loseReason = "stab";
          updateData["currentAction.actionPending"] = false; // Clear flag so we don't loop

          await updateDoc(
            doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
            updateData
          );
          return;
        }
      }
    }

    // 3. NO PENDING ACTIONS -> NEXT TURN
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      updateData
    );
    await nextTurn({ ...gameState, players: updatedPlayers });
  };

  const finishExchange = async () => {
    const me = gameState.players.find((p) => p.id === user.uid);
    const keepCount = me.cards.filter((c) => !c.flipped).length;

    if (exchangeSelection.length !== keepCount) {
      alert(`You must select exactly ${keepCount} cards.`);
      return;
    }

    const updatedPlayers = [...gameState.players];
    const pIdx = updatedPlayers.findIndex((p) => p.id === user.uid);
    const currentActiveTypes = me.cards
      .filter((c) => !c.flipped)
      .map((c) => c.type);
    const pool = [...currentActiveTypes, ...gameState.tempCards];
    const selectedTypes = exchangeSelection.map((index) => pool[index]);
    const rejectedTypes = pool.filter(
      (_, index) => !exchangeSelection.includes(index)
    );
    const existingFlipped = me.cards.filter((c) => c.flipped);
    const newActive = selectedTypes.map((type) => ({ type, flipped: false }));
    const newHand = [...newActive, ...existingFlipped];
    const newDeck = [...gameState.deck, ...rejectedTypes];

    updatedPlayers[pIdx].cards = newHand;
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      {
        players: updatedPlayers,
        deck: shuffle(newDeck),
        turnState: "IDLE",
        tempCards: null,
        currentAction: null,
      }
    );
    await nextTurn({ ...gameState, players: updatedPlayers });
    setExchangeSelection([]);
  };

  // --- Views ---

  const CardView = ({ type, flipped, onClick, selectable, size = "md" }) => {
    const info = CARDS[type];
    if (!info && !flipped) return null;
    const baseClass = `rounded-lg shadow-md border-2 transition-all duration-200 relative ${
      selectable
        ? "cursor-pointer hover:scale-105 ring-2 ring-offset-2 ring-yellow-400"
        : ""
    }`;
    const sizeClass =
      size === "sm" ? "w-14 h-20 text-[10px]" : "w-24 h-36 text-sm";
    if (flipped)
      return (
        <div
          className={`${baseClass} ${sizeClass} bg-gray-800 border-gray-700 flex items-center justify-center opacity-60`}
        >
          <Skull className="text-gray-500" />
        </div>
      );
    return (
      <div
        onClick={onClick}
        className={`${baseClass} ${sizeClass} ${info.color} border-white/20 flex flex-col items-center justify-between p-2 text-white`}
      >
        <div className="font-bold uppercase tracking-wider truncate w-full text-center">
          {info.name}
        </div>
        <info.icon size={size === "sm" ? 16 : 32} />
        {size !== "sm" && (
          <div className="text-[10px] leading-tight text-center opacity-90">
            {info.desc}
          </div>
        )}
      </div>
    );
  };

  if (!user)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  if (view === "menu") {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 relative">
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
        <h1 className="text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          CONSPIRACY
        </h1>
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
          {error && (
            <div className="bg-red-900/50 text-red-200 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          <div className="mb-6">
            <label className="text-xs text-gray-400 uppercase font-bold block mb-1">
              Nickname
            </label>
            <input
              type="text"
              className="w-full bg-gray-700 p-3 rounded border border-gray-600 text-white"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>
          <div className="space-y-6">
            <div className="border-b border-gray-700 pb-6">
              <h3 className="text-xl font-semibold mb-4 text-purple-300">
                Join Room
              </h3>
              <input
                type="text"
                placeholder="Room Code"
                className="w-full bg-gray-700 p-3 rounded mb-2 border border-gray-600"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              />
              <input
                type="password"
                placeholder="Room Password"
                className="w-full bg-gray-700 p-3 rounded mb-4 border border-gray-600"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
              />
              <button
                onClick={joinRoom}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded font-bold"
              >
                Join Game
              </button>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4 text-pink-300">
                Create Room
              </h3>
              <input
                type="password"
                placeholder="Set Room Password"
                className="w-full bg-gray-700 p-3 rounded mb-4 border border-gray-600"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
              <div className="flex justify-between mb-4 text-sm text-gray-400">
                <span>Players: {maxPlayers}</span>
                <input
                  type="range"
                  min="2"
                  max="6"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(e.target.value)}
                  className="accent-pink-500"
                />
              </div>
              <button
                onClick={createRoom}
                disabled={loading}
                className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded font-bold border border-gray-600"
              >
                Create Lobby
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowRules(true)}
            className="w-full mt-6 flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <BookOpen size={18} /> How to Play
          </button>
        </div>
      </div>
    );
  }

  if (view === "lobby" && gameState) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center">
        <div className="w-full max-w-2xl flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-purple-400">
              Lobby: {gameState.id}
            </h2>
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="text-sm text-gray-400 hover:text-white"
            >
              Leave
            </button>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-4">
              Players ({gameState.players.length}/{gameState.maxPlayers})
            </h3>
            {gameState.players.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-gray-700 p-3 rounded mb-2"
              >
                <span
                  className={
                    p.id === user.uid
                      ? "text-purple-300 font-bold"
                      : "text-white"
                  }
                >
                  {p.name} {p.id === user.uid && "(You)"}{" "}
                  {p.id === gameState.hostId && "👑"}
                </span>
                <span className="text-green-400 text-sm">Ready</span>
              </div>
            ))}
          </div>
          {gameState.hostId === user.uid ? (
            <div className="space-y-2">
              <button
                onClick={startGame}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg ${
                  gameState.players.length >= 2
                    ? "bg-green-600 hover:bg-green-500"
                    : "bg-gray-700 cursor-not-allowed"
                }`}
              >
                Start Game
              </button>
              <button
                onClick={hardResetRoom}
                className="w-full py-2 text-xs text-gray-500 hover:text-red-400"
              >
                Reset Lobby (Debug)
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-400 animate-pulse">
              Waiting for host...
            </div>
          )}
        </div>

        {/* FOOTER LOGO */}
        <ConspiracyLogo />

        {showLeaveConfirm && (
          <LeaveConfirmModal
            onConfirm={handleLeaveRoom}
            onCancel={() => setShowLeaveConfirm(false)}
          />
        )}
      </div>
    );
  }

  if (view === "game" && gameState) {
    const me = gameState.players.find((p) => p.id === user.uid);
    if (!me) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white flex-col">
          <div className="text-xl font-bold mb-4">
            You have left the game or were removed.
          </div>
          <button
            onClick={() => {
              setRoomId(null);
              setView("menu");
            }}
            className="bg-purple-600 px-4 py-2 rounded"
          >
            Back to Menu
          </button>
        </div>
      );
    }

    const isMyTurnBool = isMyTurn();
    const actionName = gameState.currentAction
      ? ACTIONS[gameState.currentAction.type].name
      : "";
    const pendingVotes =
      gameState.turnState === "ACTION_PENDING"
        ? gameState.currentAction.votes.length
        : 0;
    const neededVotes = getActivePlayers().length - 1;
    const hasVoted = gameState.currentAction?.votes.includes(user.uid);
    const showActionControls =
      gameState.turnState === "ACTION_PENDING" &&
      gameState.currentAction.actorId !== user.uid;

    // --- UPDATED: ELIMINATED PLAYERS CANNOT SEE BLOCK CONTROLS ---
    const showBlockControls =
      gameState.turnState === "BLOCK_PENDING" &&
      gameState.currentAction.blockerId !== user.uid &&
      !me.isEliminated;

    const act = gameState.currentAction;
    const alivePlayers = gameState.players.filter((p) => !p.isEliminated);

    let canIBlock = false;
    if (act) {
      if (act.type === "EXPORT") canIBlock = true;
      else if (
        (act.type === "STEAL" || act.type === "STAB") &&
        act.targetId === user.uid
      )
        canIBlock = true;
    }

    const isExchanging =
      gameState.turnState === "EXCHANGE_SELECT" &&
      me.id === getCurrentPlayer().id;
    // Resolve Target Name for Middle Text
    let targetName = null;
    let actorName = null;
    if (act) {
      const targetP = gameState.players.find((p) => p.id === act.targetId);
      const actorP = gameState.players.find((p) => p.id === act.actorId);
      if (targetP) targetName = targetP.name;
      if (actorP) actorName = actorP.name;
    }

    // Logic for LOSE_CARD message
    let loseCardTitle = "";
    let loseCardSub = "";
    if (gameState.turnState === "LOSE_CARD") {
      const loserPlayer = gameState.players.find(
        (p) => p.id === gameState.loserId
      );
      const loserName = loserPlayer ? loserPlayer.name : "Player";

      if (gameState.loseReason === "challenge") {
        loseCardTitle = "Challenge Lost";
        loseCardSub = `${loserName} is discarding a card...`;
      } else if (act && act.type === "KILL") {
        loseCardTitle = `${actorName} performs`;
        loseCardSub = `Kill on ${targetName}`;
      } else if (act && act.type === "STAB") {
        loseCardTitle = `${actorName} performs`;
        loseCardSub = `Stab on ${targetName}`;
      } else {
        // Default fallbacks
        loseCardTitle = `${loserName} lost a life`;
        loseCardSub = "Choosing card to lose...";
      }
    }

    return (
      <div className="min-h-screen bg-gray-900 text-white overflow-hidden flex flex-col relative">
        {/* HEADER */}
        <div className="p-2 bg-gray-800 flex justify-between items-center border-b border-gray-700 z-50 relative">
          <div className="text-sm font-bold text-purple-400">
            Room: {gameState.id}
          </div>
          {/* --- NEW CODE: Info and Leave Button Group --- */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLogHistory(true)}
              className="text-gray-400 hover:text-white"
            >
              <Info size={18} />
            </button>
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              <LogOut size={14} /> Leave
            </button>
          </div>
        </div>

        {/* MAIN GAME AREA */}
        <div className="flex-1 relative p-4 flex flex-col">
          {/* TURN MESSAGE OVERLAY (TOP THIRD) */}
          {gameState.turnState === "IDLE" &&
            !gameState.status.includes("finished") && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none">
                <div className="text-2xl font-black text-white/10 uppercase tracking-widest text-center whitespace-nowrap scale-150">
                  {getCurrentPlayer()?.name}'s Turn
                </div>
              </div>
            )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4 z-10">
            {gameState.players.map((p, i) => {
              if (p.id === user.uid) return null;
              return (
                <div
                  key={p.id}
                  className={`bg-gray-800 p-2 rounded border ${
                    gameState.turnIndex === i
                      ? "border-yellow-500"
                      : "border-gray-700"
                  } ${p.isEliminated ? "opacity-50" : ""} relative`}
                >
                  {/* --- NEW CODE: Eliminated Banner --- */}
                  {p.isEliminated && (
                    <div className="absolute inset-x-0 top-8 bg-red-900/80 text-red-500 text-[10px] font-black uppercase tracking-widest text-center py-1 z-20 border-y border-red-700">
                      ELIMINATED
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-xs truncate w-20">
                      {p.name}
                    </span>
                    <div className="flex items-center space-x-1 bg-black/30 px-1 rounded">
                      <Coins size={10} className="text-yellow-400" />
                      <span className="text-xs">{p.coins}</span>
                    </div>
                  </div>
                  <div className="flex justify-center space-x-1">
                    {p.cards.map((c, idx) => (
                      <div
                        key={idx}
                        className={`w-6 h-8 rounded border ${
                          c.flipped
                            ? "bg-gray-900 border-gray-600"
                            : "bg-blue-900 border-blue-500"
                        } flex items-center justify-center`}
                      >
                        {c.flipped && (
                          <Skull size={10} className="text-gray-600" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* --- TARGET BUTTONS --- */}
                  {isMyTurnBool &&
                    gameState.turnState === "IDLE" &&
                    !p.isEliminated && (
                      <div className="mt-2 grid grid-cols-3 gap-1">
                        <button
                          disabled={p.coins < 2}
                          onClick={() => handleAction("STEAL", p.id)}
                          className="disabled:opacity-30 bg-blue-900/50 border border-blue-700 hover:bg-blue-800 py-1 rounded text-[9px] font-bold"
                        >
                          Steal
                        </button>
                        <button
                          disabled={me.coins < 3}
                          onClick={() => handleAction("STAB", p.id)}
                          className="disabled:opacity-30 bg-red-900/50 border border-red-700 hover:bg-red-800 py-1 rounded text-[9px] font-bold"
                        >
                          Stab(3)
                        </button>
                        <button
                          disabled={me.coins < 7}
                          onClick={() => handleAction("KILL", p.id)}
                          className="disabled:opacity-30 bg-red-950 border border-red-900 hover:bg-red-900 py-1 rounded text-[9px] font-bold text-red-500"
                        >
                          Kill(7)
                        </button>
                      </div>
                    )}

                  {/* --- GREEN TICK FOR VOTES --- */}
                  {gameState.currentAction?.votes.includes(p.id) &&
                    (gameState.turnState === "ACTION_PENDING" ||
                      gameState.turnState === "BLOCK_PENDING") && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-green-400 bg-black rounded-full p-1 border border-green-500 shadow-lg">
                        <CheckCircle size={16} className="fill-current" />
                      </div>
                    )}
                </div>
              );
            })}
          </div>
          <div className="flex-1 flex flex-col items-center justify-center my-2 space-y-4 z-10">
            {gameState.status === "finished" && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
                <Trophy
                  size={64}
                  className="text-yellow-400 mb-4 animate-bounce"
                />
                <div className="text-4xl font-bold text-white mb-2">
                  Game Over
                </div>
                <div className="text-2xl text-purple-400 mb-8">
                  {alivePlayers[0]?.name} Wins!
                </div>
                {gameState.hostId === user.uid ? (
                  <button
                    onClick={restartGame}
                    className="bg-green-600 hover:bg-green-500 px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-2 shadow-lg"
                  >
                    <RotateCcw /> Play Again
                  </button>
                ) : (
                  <div className="text-gray-400 animate-pulse">
                    Waiting for host to restart...
                  </div>
                )}
              </div>
            )}

            {/* CENTER MESSAGE AREA: PENDING OR KILL/LOSE */}
            {(gameState.turnState === "ACTION_PENDING" ||
              gameState.turnState === "LOSE_CARD") && (
              <div className="w-full max-w-md bg-gray-800 p-4 rounded border border-yellow-500/50 relative shadow-2xl">
                <div className="text-center mb-3">
                  {gameState.turnState === "LOSE_CARD" ? (
                    <>
                      <div className="text-sm text-gray-400 mt-1">
                        {loseCardTitle}
                      </div>
                      <div
                        className={`text-xl font-bold ${
                          gameState.loseReason === "challenge"
                            ? "text-red-500"
                            : "text-yellow-400"
                        }`}
                      >
                        {loseCardSub}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-gray-400">
                        {getCurrentPlayer().name} attempts
                      </div>
                      <div className="text-xl font-bold text-yellow-400">
                        {actionName} {targetName ? ` on ${targetName}` : ""}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Votes: {pendingVotes} / {neededVotes}
                      </div>
                      <div className="w-full bg-gray-700 h-1 mt-1 rounded overflow-hidden">
                        <div
                          className="bg-green-500 h-full transition-all duration-300"
                          style={{
                            width: `${(pendingVotes / neededVotes) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </>
                  )}
                </div>

                {/* CONTROLS FOR PENDING */}
                {gameState.turnState === "ACTION_PENDING" &&
                  showActionControls &&
                  !me.isEliminated && (
                    <div className="grid grid-cols-2 gap-2">
                      {hasVoted ? (
                        /* --- STATE 1: USER HAS VOTED (SHOW ONLY WAITING) --- */
                        <div className="col-span-2 bg-gray-700 py-2 text-center text-gray-400 text-sm rounded">
                          Waiting for others...
                        </div>
                      ) : (
                        /* --- STATE 2: USER HAS NOT VOTED (SHOW ALL BUTTONS) --- */
                        <>
                          <button
                            onClick={handlePass}
                            className="col-span-2 bg-green-600 hover:bg-green-500 py-3 rounded font-bold"
                          >
                            Pass (Accept)
                          </button>

                          {/* Challenge Button - Hidden if action is EXPORT */}
                          {act.type !== "EXPORT" && (
                            <button
                              onClick={() => handleChallenge(user.uid)}
                              className="bg-red-600 hover:bg-red-500 py-2 rounded text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <XCircle size={14} /> Challenge
                            </button>
                          )}

                          {/* Block Buttons */}
                          {canIBlock && act.type === "EXPORT" && (
                            <button
                              onClick={() => handleBlock(user.uid, "HERO")}
                              className="bg-purple-600 py-2 rounded text-xs font-bold"
                            >
                              Block (Hero)
                            </button>
                          )}
                          {canIBlock && act.type === "STEAL" && (
                            <>
                              <button
                                onClick={() => handleBlock(user.uid, "ROBBER")}
                                className="bg-blue-600 py-2 rounded text-xs font-bold"
                              >
                                Block (Robber)
                              </button>
                              <button
                                onClick={() => handleBlock(user.uid, "RIDDLER")}
                                className="bg-emerald-600 py-2 rounded text-xs font-bold"
                              >
                                Block (Riddler)
                              </button>
                            </>
                          )}
                          {canIBlock && act.type === "STAB" && (
                            <button
                              onClick={() => handleBlock(user.uid, "GENIE")}
                              className="bg-pink-600 py-2 rounded text-xs font-bold"
                            >
                              Block (Genie)
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                {/* WAITING MESSAGE FOR PENDING */}
                {gameState.turnState === "ACTION_PENDING" &&
                  !showActionControls && (
                    <div className="text-center text-xs text-gray-500 animate-pulse">
                      Waiting for consensus...
                    </div>
                  )}
              </div>
            )}

            {gameState.turnState === "BLOCK_PENDING" && (
              <div className="bg-gray-800 p-4 rounded border border-purple-500 w-full max-w-md text-center shadow-2xl">
                <div className="mb-2">
                  <span className="font-bold">
                    {
                      gameState.players.find(
                        (p) => p.id === gameState.currentAction.blockerId
                      ).name
                    }
                  </span>{" "}
                  blocks with{" "}
                  <span className="font-bold text-purple-400">
                    {gameState.currentAction.blockClaim}
                  </span>
                </div>
                {showBlockControls && (
                  <div className="grid grid-cols-2 gap-2">
                    {gameState.currentAction.votes.includes(user.uid) ? (
                      /* --- STATE 1: USER HAS VOTED (SHOW ONLY WAITING) --- */
                      <div className="col-span-2 text-gray-500 text-xs">
                        You passed. Waiting...
                      </div>
                    ) : (
                      /* --- STATE 2: USER HAS NOT VOTED (SHOW ACCEPT & CHALLENGE) --- */
                      <>
                        <button
                          onClick={handleAcceptBlock}
                          className="bg-gray-600 hover:bg-gray-500 py-2 rounded text-sm"
                        >
                          Accept Block
                        </button>
                        <button
                          onClick={() => handleChallenge(user.uid)}
                          className="bg-red-600 hover:bg-red-500 py-2 rounded text-sm font-bold"
                        >
                          Challenge Block
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            {gameState.turnState === "CHALLENGE_RESOLVE" && (
              <div className="text-center w-full max-w-md">
                <div className="text-red-400 font-bold mb-2 bg-red-900/20 p-2 rounded border border-red-900">
                  CHALLENGE IN PROGRESS
                </div>
                {gameState.accusedId === user.uid ? (
                  <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <div className="text-sm mb-4">
                      Prove you have <strong>{gameState.challengedCard}</strong>
                    </div>
                    <div className="flex justify-center gap-2">
                      {me.cards.map(
                        (c, i) =>
                          !c.flipped && (
                            <button
                              key={i}
                              onClick={() => resolveChallenge(i)}
                              className="bg-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-600 border border-gray-500"
                            >
                              Show {c.type}
                            </button>
                          )
                      )}
                    </div>
                    <button
                      onClick={handleSurrender}
                      className="mt-4 text-xs text-red-400 underline"
                    >
                      I don't have it (Surrender)
                    </button>
                  </div>
                ) : (
                  <div className="text-sm animate-pulse">
                    Waiting for accused to reveal...
                  </div>
                )}
              </div>
            )}
            {isExchanging && (
              <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 pb-32">
                <h3 className="text-xl font-bold mb-2 text-emerald-400">
                  Riddler Exchange
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                  Keep exactly {me.cards.filter((c) => !c.flipped).length}{" "}
                  cards.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6 max-w-md w-full">
                  {[
                    ...me.cards.filter((c) => !c.flipped).map((c) => c.type),
                    ...gameState.tempCards,
                  ].map((cardType, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        const newSel = [...exchangeSelection];
                        // Use INDEX matching now
                        if (newSel.includes(i)) {
                          const removeIdx = newSel.indexOf(i);
                          newSel.splice(removeIdx, 1);
                          setExchangeSelection(newSel);
                        } else if (
                          newSel.length <
                          me.cards.filter((c) => !c.flipped).length
                        ) {
                          setExchangeSelection([...newSel, i]);
                        }
                      }}
                      className={`p-4 rounded border-2 text-center font-bold cursor-pointer transition-colors ${
                        exchangeSelection.includes(i)
                          ? "border-emerald-500 bg-emerald-900/50"
                          : "border-gray-600 bg-gray-800"
                      }`}
                    >
                      {cardType}
                    </div>
                  ))}
                </div>
                <button
                  onClick={finishExchange}
                  className="bg-emerald-600 px-12 py-3 rounded font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    exchangeSelection.length !==
                    me.cards.filter((c) => !c.flipped).length
                  }
                >
                  Confirm
                </button>
              </div>
            )}
          </div>

          {/* --- NEW LOG FIELD ABOVE CARDS (HIDDEN ON FINISH) --- */}
          {!isExchanging && gameState.status !== "finished" && (
            <div className="w-full max-w-md mx-auto mb-2 flex flex-col items-center space-y-1 pointer-events-none z-20">
              {gameState.logs
                ?.slice(-3)
                .reverse()
                .map((log, i) => (
                  <div
                    key={i}
                    className={`text-xs px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white shadow-sm transition-opacity duration-500`}
                    style={{ opacity: Math.max(0.2, 0.6 - i * 0.2) }}
                  >
                    {log.text}
                  </div>
                ))}
            </div>
          )}

          {!me.isEliminated ? (
            <div
              className={`mt-auto bg-gray-800 p-3 rounded-t-xl border-t border-gray-700 shadow-2xl ${
                gameState.turnState === "LOSE_CARD" &&
                gameState.loserId === user.uid
                  ? "ring-2 ring-red-500"
                  : ""
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  <div className="bg-yellow-500 text-black px-2 py-1 rounded font-bold text-sm flex items-center">
                    <Coins size={14} className="mr-1" /> {me.coins}
                  </div>
                  <span className="text-xs text-gray-400">{me.name}</span>
                </div>
                {gameState.turnState === "LOSE_CARD" &&
                  gameState.loserId === user.uid && (
                    <div className="text-red-400 font-bold text-sm animate-pulse">
                      CLICK A CARD TO LOSE IT!
                    </div>
                  )}
              </div>
              <div className="flex justify-center space-x-2 mb-4">
                {me.cards.map((c, i) => (
                  <CardView
                    key={i}
                    type={c.type}
                    flipped={c.flipped}
                    selectable={
                      gameState.turnState === "LOSE_CARD" &&
                      gameState.loserId === user.uid &&
                      !c.flipped
                    }
                    onClick={() => {
                      if (
                        gameState.turnState === "LOSE_CARD" &&
                        gameState.loserId === user.uid &&
                        !c.flipped
                      )
                        loseLife(i);
                    }}
                  />
                ))}
              </div>
              {isMyTurnBool && gameState.turnState === "IDLE" && (
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleAction("EARN")}
                    className="bg-gray-700 p-2 rounded flex flex-col items-center"
                  >
                    <Coins size={16} className="text-yellow-200" />
                    <span className="text-[10px]">Earn (1 coin)</span>
                  </button>
                  <button
                    onClick={() => handleAction("EXPORT")}
                    className="bg-gray-700 p-2 rounded flex flex-col items-center"
                  >
                    <DoorOpen size={16} className="text-blue-200" />
                    <span className="text-[10px]">Export (2 coins)</span>
                  </button>
                  <button
                    onClick={() => handleAction("TAX")}
                    className="bg-purple-900/50 border border-purple-700 p-2 rounded flex flex-col items-center"
                  >
                    <Crown size={16} className="text-purple-300" />
                    <span className="text-[10px]">Hero (3 coins)</span>
                  </button>
                  <button
                    onClick={() => handleAction("EXCHANGE")}
                    className="bg-emerald-900/50 border border-emerald-700 p-2 rounded flex flex-col items-center"
                  >
                    <RefreshCcw size={16} className="text-emerald-300" />
                    <span className="text-[10px]">Riddler (exchange card)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-900/20 p-4 text-center border-t border-red-900 text-red-500 font-bold">
              ELIMINATED
            </div>
          )}
        </div>

        {/* GAME SCREEN FOOTER LOGO */}
        <div className="bg-gray-800 pb-1 pt-1">
          <ConspiracyLogo />
        </div>

        {showLeaveConfirm && (
          <LeaveConfirmModal
            onConfirm={handleLeaveRoom}
            onCancel={() => setShowLeaveConfirm(false)}
          />
        )}

        {/* --- NEW CODE: Log History Modal --- */}
        {showLogHistory && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-2xl w-full max-w-md h-[80vh] flex flex-col border border-gray-700 shadow-2xl">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-2xl">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Info size={18} /> Game Logs
                </h3>
                <button onClick={() => setShowLogHistory(false)}>
                  <X className="text-gray-400 hover:text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {[...(gameState.logs || [])].reverse().map((log, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2 rounded border-l-2 ${
                      log.type === "danger"
                        ? "bg-red-900/20 border-red-500 text-red-200"
                        : log.type === "success"
                        ? "bg-green-900/20 border-green-500 text-green-200"
                        : log.type === "warning"
                        ? "bg-yellow-900/20 border-yellow-500 text-yellow-200"
                        : "bg-gray-700/50 border-gray-500 text-gray-300"
                    }`}
                  >
                    {log.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
}
//coin management issue solved for steal, stab, export