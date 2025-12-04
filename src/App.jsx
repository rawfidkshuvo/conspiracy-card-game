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
  Info,
  Eye, // Bouncing icon
  User,
  Zap,
  History,
} from "lucide-react";

// --- Firebase Config & Init ---
const firebaseConfig = {
  apiKey: "AIzaSyBjIjK53vVJW1y5RaqEFGSFp0ECVDBEe1o",
  authDomain: "game-hub-ff8aa.firebaseapp.com",
  projectId: "game-hub-ff8aa",
  storageBucket: "game-hub-ff8aa.firebasestorage.app",
  messagingSenderId: "586559578902",
  appId: "1:586559578902:web:e2c7114fcf22055a6aa637",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = typeof __app_id !== "undefined" ? __app_id : "conspiracy-game";

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
    name: "Hero Bonus",
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

// UPDATED: Subtle Purple Hue
const FloatingBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-gray-900 to-black" />
    <div className="absolute top-0 left-0 w-full h-full bg-purple-500/5 mix-blend-overlay" />
    <div
      className="absolute inset-0 opacity-10"
      style={{
        backgroundImage:
          'url("https://www.transparenttextures.com/patterns/black-scales.png")',
      }}
    ></div>
  </div>
);

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
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-purple-500/30 shadow-2xl flex flex-col">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 font-serif tracking-wider">
            <BookOpen className="text-purple-400" /> Archive of Secrets
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"
          >
            <X />
          </button>
        </div>

        <div className="flex gap-2 p-4 bg-gray-900 border-b border-gray-800 overflow-x-auto">
          <TabButton id="basics" label="Basics" icon={Coins} />
          <TabButton id="cards" label="Roles" icon={Crown} />
          <TabButton id="actions" label="Actions" icon={Sword} />
          <TabButton id="challenges" label="Bluffing" icon={XCircle} />
        </div>

        <div className="p-6 overflow-y-auto flex-1 text-gray-300 space-y-6">
          {tab === "basics" && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-xl font-bold text-purple-400">
                Objective: Last Survivor
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base">
                <li>
                  Start with <strong>2 Cards</strong> (Lives) and{" "}
                  <strong>2 Coins</strong>.
                </li>
                <li>
                  Cards are hidden. You can <strong>lie</strong> about what you
                  have.
                </li>
                <li>
                  Lose a life (flip card) if you are successfully challenged or
                  assassinated.
                </li>
                <li>
                  Lose all cards = <strong>Eliminated</strong>.
                </li>
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
                  <div
                    className={`p-3 rounded-lg ${card.color} text-white shadow-lg`}
                  >
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
                <h4 className="font-bold text-white mb-2">Safe Actions</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Earn:</strong> +1 Coin. (Unblockable)
                  </p>
                  <p>
                    <strong>Export:</strong> +2 Coins. (Blocked by Hero)
                  </p>
                  <p>
                    <strong>Kill:</strong> Pay 7 coins to eliminate a life.
                    (Unblockable)
                  </p>
                </div>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg border-l-4 border-purple-500">
                <h4 className="font-bold text-white mb-2">
                  Role Actions (Lie about these!)
                </h4>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>
                    <strong>Hero Bonus:</strong> +3 Coins.
                  </li>
                  <li>
                    <strong>Steal:</strong> Take 2 coins from player.
                  </li>
                  <li>
                    <strong>Stab:</strong> Pay 3 coins to kill.
                  </li>
                  <li>
                    <strong>Exchange:</strong> Draw 2 new cards, return 2.
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
                <p className="text-sm">
                  You can perform ANY action, even if you don't have the card.
                  If someone challenges you, you must prove it.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30">
                  <h4 className="font-bold text-white mb-2">If Challenged:</h4>
                  <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
                    <li>
                      <strong>Have it?</strong> Reveal it. Challenger loses a
                      life. You get a fresh card.
                    </li>
                    <li>
                      <strong>Don't have it?</strong> You lose a life.
                    </li>
                  </ul>
                </div>
                <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
                  <h4 className="font-bold text-white mb-2">Blocking</h4>
                  <p className="text-sm">
                    Block attacks by claiming a defensive role (e.g. Genie
                    blocks Stab). Blocks can also be challenged!
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
  <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 animate-in fade-in">
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-sm w-full text-center shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-2">Abandon Conspiracy?</h3>
      <p className="text-gray-400 mb-6 text-sm">
        Leaving now will forfeit your position in the game.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCancel}
          className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded font-bold transition-colors"
        >
          Stay
        </button>
        <button
          onClick={onConfirm}
          className="bg-red-600 hover:bg-red-500 text-white py-3 rounded font-bold transition-colors"
        >
          Leave
        </button>
      </div>
    </div>
  </div>
);

const ConspiracyLogo = () => (
  <div className="flex items-center justify-center gap-1 opacity-40 mt-auto pb-2 pt-2 relative z-10">
    <Eye size={12} className="text-purple-500" />
    <span className="text-[10px] font-black tracking-widest text-purple-500 uppercase">
      CONSPIRACY
    </span>
  </div>
);

export default function ConspiracyGame() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("menu");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exchangeSelection, setExchangeSelection] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showLogHistory, setShowLogHistory] = useState(false);

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
      maxPlayers: 6,
      startingCards: 2,
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

  const updateSettings = async (cards) => {
    if (!gameState || gameState.hostId !== user.uid) return;
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      { startingCards: parseInt(cards) }
    );
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
    if (status === "playing" && updatedPlayers.length < 2) status = "finished";

    const myIndex = gameState.players.findIndex((p) => p.id === user.uid);
    let newTurnIndex = gameState.turnIndex;
    if (myIndex < gameState.turnIndex)
      newTurnIndex = Math.max(0, newTurnIndex - 1);
    if (newTurnIndex >= updatedPlayers.length) newTurnIndex = 0;

    const logs = [...(gameState.logs || [])];
    const me = gameState.players.find((p) => p.id === user.uid);
    if (me) logs.push({ text: `${me.name} left the game.`, type: "danger" });
    if (status === "finished" && gameState.status === "playing")
      logs.push({ text: "Not enough players. Game Over.", type: "neutral" });

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
    const handSize = gameState.startingCards || 2;

    const players = gameState.players.map((p) => {
      const hand = [];
      for (let i = 0; i < handSize; i++) {
        hand.push({ type: deck.pop(), flipped: false });
      }
      return {
        ...p,
        coins: 2,
        cards: hand,
        isEliminated: false,
      };
    });
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

  const restartGame = async () => {
    if (!gameState || gameState.hostId !== user.uid) return;
    const deck = shuffle([...DECK_TEMPLATE, ...DECK_TEMPLATE]);
    const handSize = gameState.startingCards || 2;

    const players = gameState.players.map((p) => {
      const hand = [];
      for (let i = 0; i < handSize; i++) {
        hand.push({ type: deck.pop(), flipped: false });
      }
      return {
        ...p,
        coins: 2,
        cards: hand,
        isEliminated: false,
      };
    });

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
    if (checks >= 10)
      nextIndex = currentRoomState.players.findIndex((p) => !p.isEliminated);

    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      {
        turnIndex: nextIndex,
        turnState: "IDLE",
        currentAction: null,
        players: currentRoomState.players,
        loseReason: null,
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

    // 1. EARN (Immediate)
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

    // 2. KILL (Immediate Deduction)
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
          loseReason: "kill",
          logs: arrayUnion({
            text: `${player.name} killed ${targetName} (-7 coins).`,
            type: "danger",
          }),
        }
      );
      return;
    }

    // 3. STAB (Immediate Deduction)
    if (actionKey === "STAB") {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.turnIndex].coins -= 3; // Pay upfront

      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        {
          players: updatedPlayers,
          turnState: "ACTION_PENDING",
          currentAction: actionPayload,
        }
      );
      return;
    }

    // 4. ALL OTHER ACTIONS (Tax, Steal, Export, Exchange)
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      {
        turnState: "ACTION_PENDING",
        currentAction: actionPayload,
      }
    );
  };

  const handlePass = async () => {
    if (gameState.turnState !== "ACTION_PENDING") return;
    if (!gameState.currentAction) return;
    if (gameState.currentAction.votes.includes(user.uid)) return;

    const newVotes = [...gameState.currentAction.votes, user.uid];
    const livingPlayers = getActivePlayers().length;

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

  const confirmAction = async () => {
    if (gameState.turnState !== "ACTION_PENDING") return;

    const action = ACTIONS[gameState.currentAction.type];
    const actor = gameState.players.find(
      (p) => p.id === gameState.currentAction.actorId
    );
    const updatedPlayers = [...gameState.players];
    let logMsg = "";
    const actorIndex = updatedPlayers.findIndex((p) => p.id === actor.id);

    if (gameState.currentAction.type === "EXPORT") {
      updatedPlayers[actorIndex].coins += 2;
      logMsg = `${actor.name} completes Export and gains 2 coins.`;
    } else if (gameState.currentAction.type === "TAX") {
      updatedPlayers[actorIndex].coins += 3;
      logMsg = `${actor.name} collects Hero Bonus and gains 3 coins.`;
    } else if (gameState.currentAction.type === "STEAL") {
      const targetIndex = updatedPlayers.findIndex(
        (p) => p.id === gameState.currentAction.targetId
      );
      const targetName = updatedPlayers[targetIndex].name;
      const stolen = Math.min(updatedPlayers[targetIndex].coins, 2);
      updatedPlayers[targetIndex].coins -= stolen;
      updatedPlayers[actorIndex].coins += stolen;
      logMsg = `${actor.name} steals ${stolen} coins from ${targetName}.`;
    } else if (gameState.currentAction.type === "STAB") {
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
            text: `${actor.name} Assassinated ${targetName}!`,
            type: "danger",
          }),
        }
      );
      return;
    } else if (gameState.currentAction.type === "EXCHANGE") {
      const deck = [...gameState.deck];
      if (deck.length < 2) deck.push(...DECK_TEMPLATE);
      const newCards = [deck.pop(), deck.pop()];
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        {
          turnState: "EXCHANGE_SELECT",
          deck,
          tempCards: newCards,
          logs: arrayUnion({
            text: `${actor.name} examines the deck (Exchange).`,
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
    const blockerName = gameState.players.find((p) => p.id === blockerId).name;
    const actorName = gameState.players.find(
      (p) => p.id === gameState.currentAction.actorId
    ).name;
    const actionName = ACTIONS[gameState.currentAction.type].name;

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
          text: `${blockerName} blocks ${actorName}'s ${actionName} claiming ${claimCard}!`,
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
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
        {
          logs: arrayUnion({
            text: "Block Accepted. Action Failed (Coins lost).",
            type: "info",
          }),
        }
      );
      await nextTurn({ ...gameState });
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
    const challengerName = gameState.players.find(
      (p) => p.id === challengerId
    ).name;
    const accusedName = gameState.players.find((p) => p.id === accusedId).name;

    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
      {
        turnState: "CHALLENGE_RESOLVE",
        challengerId,
        accusedId,
        challengedCard: claim,
        logs: arrayUnion({
          text: `${challengerName} challenges ${accusedName}'s claim of ${claim}!`,
          type: "danger",
        }),
      }
    );
  };

  const handleSurrender = async () => {
    const updatedPlayers = [...gameState.players];
    const me = updatedPlayers.find((p) => p.id === user.uid);
    const myIdx = updatedPlayers.findIndex((p) => p.id === user.uid);
    const activeCards = me.cards
      .map((c, i) => ({ ...c, index: i }))
      .filter((c) => !c.flipped);
    const actor = gameState.players.find(
      (p) => p.id === gameState.currentAction.actorId
    );

    let targetName = "";
    if (gameState.currentAction.targetId) {
      const t = gameState.players.find(
        (p) => p.id === gameState.currentAction.targetId
      );
      targetName = t ? t.name : "Target";
    }

    let logs = [];
    let actionPending = false;
    let nextState = "IDLE";
    let nextLoserId = null;
    let nextLoseReason = null;

    const isBlockerSurrendering =
      gameState.currentAction.blockerId === user.uid;

    if (isBlockerSurrendering) {
      logs.push({
        text: `Blocker ${me.name} admits to lying! Block removed.`,
        type: "danger",
      });
      const act = gameState.currentAction;
      const actorIdx = updatedPlayers.findIndex((p) => p.id === act.actorId);

      if (act.type === "STEAL") {
        const targetIdx = updatedPlayers.findIndex(
          (p) => p.id === act.targetId
        );
        const stolen = Math.min(updatedPlayers[targetIdx].coins, 2);
        updatedPlayers[targetIdx].coins -= stolen;
        updatedPlayers[actorIdx].coins += stolen;
        logs.push({
          text: `Block Failed: ${actor.name} steals ${stolen} from ${targetName}.`,
          type: "success",
        });
      } else if (act.type === "EXPORT") {
        updatedPlayers[actorIdx].coins += 2;
        logs.push({
          text: `Block Failed: ${actor.name} gains 2 coins (Export).`,
          type: "success",
        });
      } else if (act.type === "TAX") {
        updatedPlayers[actorIdx].coins += 3;
        logs.push({
          text: `Block Failed: ${actor.name} gains 3 coins (Hero Bonus).`,
          type: "success",
        });
      } else if (act.type === "STAB") {
        actionPending = true;
        logs.push({
          text: `Block Failed: ${actor.name}'s Assassination proceeds!`,
          type: "danger",
        });
      } else if (act.type === "EXCHANGE") {
        actionPending = true;
        logs.push({
          text: `Block Failed: ${actor.name} proceeds with Exchange.`,
          type: "info",
        });
      }
    } else {
      logs.push({
        text: `Actor ${me.name} admits to lying! Action cancelled.`,
        type: "danger",
      });
    }

    if (activeCards.length === 1) {
      updatedPlayers[myIdx].cards[activeCards[0].index].flipped = true;
      updatedPlayers[myIdx].isEliminated = true;
      logs.push({ text: `${me.name} is ELIMINATED!`, type: "danger" });
    } else {
      nextState = "LOSE_CARD";
      nextLoserId = user.uid;
      nextLoseReason = "challenge";
    }

    const isGameOver = checkGameOver(updatedPlayers);
    let updateData = {
      players: updatedPlayers,
      logs: arrayUnion(...logs),
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
    if (isGameOver) return;
    if (nextState === "LOSE_CARD") return;

    if (actionPending) {
      if (gameState.currentAction.type === "STAB") {
        const act = gameState.currentAction;
        const targetP = updatedPlayers.find((p) => p.id === act.targetId);
        if (targetP && !targetP.isEliminated) {
          await updateDoc(
            doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
            {
              turnState: "LOSE_CARD",
              loserId: act.targetId,
              loseReason: "stab",
              "currentAction.actionPending": false,
              logs: arrayUnion({
                text: "Assassination continues... Target must lose a life.",
                type: "danger",
              }),
            }
          );
          return;
        } else {
          await updateDoc(
            doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
            {
              logs: arrayUnion({
                text: "Target eliminated. Assassination complete.",
                type: "neutral",
              }),
            }
          );
          await nextTurn({ ...gameState, players: updatedPlayers });
          return;
        }
      } else if (gameState.currentAction.type === "EXCHANGE") {
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
    }
    await nextTurn({ ...gameState, players: updatedPlayers });
  };

  const resolveChallenge = async (cardIndex) => {
    const accusedPlayer = gameState.players.find((p) => p.id === user.uid);
    const revealedCard = accusedPlayer.cards[cardIndex];
    const requiredCard = gameState.challengedCard;
    const hasCard = revealedCard.type === requiredCard;

    const actor = gameState.players.find(
      (p) => p.id === gameState.currentAction.actorId
    );
    const challenger = gameState.players.find(
      (p) => p.id === gameState.challengerId
    );
    let targetName = "";
    if (gameState.currentAction.targetId) {
      targetName = gameState.players.find(
        (p) => p.id === gameState.currentAction.targetId
      ).name;
    }

    let updatedPlayers = [...gameState.players];
    let newDeck = [...gameState.deck];
    let nextStepLogs = [];
    let nextState = "IDLE";
    let nextLoserId = null;
    let nextLoseReason = null;
    let actionPending = false;

    const isBlockChallenge =
      gameState.currentAction.blockerId &&
      gameState.currentAction.blockerId === gameState.accusedId;

    // 1. Resolve Card Reveal
    if (hasCard) {
      nextStepLogs.push({
        text: `Challenge Failed: ${accusedPlayer.name} shows ${requiredCard}! ${challenger.name} loses a life.`,
        type: "success",
      });
      newDeck.push(revealedCard.type);
      newDeck = shuffle(newDeck);
      const pIdx = updatedPlayers.findIndex((p) => p.id === user.uid);
      updatedPlayers[pIdx].cards[cardIndex] = {
        type: newDeck.pop(),
        flipped: false,
      };
      nextState = "LOSE_CARD";
      nextLoserId = gameState.challengerId;
      nextLoseReason = "challenge";
    } else {
      nextStepLogs.push({
        text: `Challenge Won: ${accusedPlayer.name} caught lying! Choose a card to lose.`,
        type: "danger",
      });
      nextState = "LOSE_CARD";
      nextLoserId = user.uid;
      nextLoseReason = "challenge";
    }

    // 2. Resolve Action Outcome
    const act = gameState.currentAction;
    const aIdx = updatedPlayers.findIndex((p) => p.id === act.actorId);

    if (isBlockChallenge) {
      if (hasCard) {
        nextStepLogs.push({
          text: `Block Upheld. ${actor.name}'s action blocked.`,
          type: "warning",
        });
      } else {
        if (act.type === "TAX") {
          updatedPlayers[aIdx].coins += 3;
          nextStepLogs.push({
            text: "Block Invalid: Hero Bonus succeeds (+3).",
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
          actionPending = true;
          nextStepLogs.push({
            text: "Block Invalid: Stab proceeds! (Double Kill pending)",
            type: "danger",
          });
        }
        if (act.type === "EXCHANGE") actionPending = true;
      }
    } else {
      if (hasCard) {
        if (act.type === "TAX") updatedPlayers[aIdx].coins += 3;
        if (act.type === "EXPORT") updatedPlayers[aIdx].coins += 2;
        if (act.type === "STEAL") {
          const tIdx = updatedPlayers.findIndex((p) => p.id === act.targetId);
          const s = Math.min(updatedPlayers[tIdx].coins, 2);
          updatedPlayers[tIdx].coins -= s;
          updatedPlayers[aIdx].coins += s;
        }
        if (act.type === "STAB") {
          actionPending = true;
        }
        if (act.type === "EXCHANGE") actionPending = true;
        if (!actionPending)
          nextStepLogs.push({
            text: "Action Upheld: Success.",
            type: "success",
          });
      } else {
        nextStepLogs.push({
          text: "Action Failed: Bluff called.",
          type: "warning",
        });
      }
    }

    // 3. Save
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

    updatedPlayers[pIdx].cards[cardIndex].flipped = true;
    const isEliminated = updatedPlayers[pIdx].cards.every((c) => c.flipped);
    if (isEliminated) updatedPlayers[pIdx].isEliminated = true;

    const logEntries = [
      {
        text: `${updatedPlayers[pIdx].name} lost a life (${gameState.loseReason}).`,
        type: "danger",
      },
    ];
    if (isEliminated)
      logEntries.push({
        text: `${updatedPlayers[pIdx].name} is ELIMINATED!`,
        type: "danger",
      });

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

    if (gameState.currentAction?.actionPending) {
      if (gameState.currentAction.type === "EXCHANGE") {
        await updateDoc(
          doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
          updateData
        );
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
      if (gameState.currentAction.type === "STAB") {
        const targetId = gameState.currentAction.targetId;
        const targetPlayer = updatedPlayers.find((p) => p.id === targetId);
        if (targetPlayer && !targetPlayer.isEliminated) {
          updateData.logs = arrayUnion(...logEntries, {
            text: "Challenge penalty paid. Assassination continues... (Lose 2nd Life)",
            type: "danger",
          });
          updateData.turnState = "LOSE_CARD";
          updateData.loserId = targetId;
          updateData.loseReason = "stab";
          updateData["currentAction.actionPending"] = false;
          await updateDoc(
            doc(db, "artifacts", appId, "public", "data", "rooms", roomId),
            updateData
          );
          return;
        } else {
          logEntries.push({
            text: "Target eliminated. Assassination complete.",
            type: "neutral",
          });
          updateData.logs = arrayUnion(...logEntries);
        }
      }
    }
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
  const CardView = ({
    type,
    flipped,
    onClick,
    selectable,
    selected,
    size = "md",
  }) => {
    const info = CARDS[type];
    if (!info && !flipped) return null;

    // Default ring color for selectable items (red/loss)
    let ringColor = "ring-purple-400";
    // If specifically selected in exchange modal (green/emerald)
    if (selected) ringColor = "ring-emerald-400 ring-offset-emerald-900";

    const baseClass = `rounded-lg shadow-md border-2 transition-all duration-200 relative ${
      selectable || selected
        ? `cursor-pointer hover:scale-105 ring-2 ring-offset-2 ${ringColor}`
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
        className={`${baseClass} ${sizeClass} ${info.color} border-white/20 flex flex-col items-center justify-between p-2 text-white shadow-lg`}
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
        {selected && (
          <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-lg">
            <CheckCircle size={12} />
          </div>
        )}
      </div>
    );
  };

  if (!user)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white font-serif">
        <div className="animate-pulse">Loading Archive...</div>
      </div>
    );

  if (view === "menu") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <FloatingBackground />

        {showRules && <RulesModal onClose={() => setShowRules(false)} />}

        <div className="z-10 text-center mb-10 animate-in fade-in zoom-in duration-700">
          <Eye
            size={64}
            className="text-purple-500 mx-auto mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
          />
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-purple-300 to-purple-600 font-serif tracking-widest drop-shadow-md">
            CONSPIRACY
          </h1>
          <p className="text-white-400/60 tracking-[0.3em] uppercase mt-2">
            The Silent Betrayal
          </p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur border border-purple-500/30 p-8 rounded-2xl w-full max-w-md shadow-2xl z-10 animate-in slide-in-from-bottom-10 duration-700 delay-100">
          {error && (
            <div className="bg-red-900/50 text-red-200 p-2 mb-4 rounded text-center text-sm border border-red-800">
              {error}
            </div>
          )}
          <input
            className="w-full bg-black/50 border border-gray-600 p-3 rounded mb-4 text-white placeholder-gray-500 focus:border-purple-500 outline-none transition-colors"
            placeholder="Agent Codename"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button
            onClick={createRoom}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 p-4 rounded font-bold mb-4 flex items-center justify-center gap-2 border border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.2)] transition-all"
          >
            <Crown size={20} /> Establish Back Room
          </button>

          {/* UPDATED: Responsive Flex Column for Mobile */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              className="w-full sm:flex-1 bg-black/50 border border-gray-600 p-3 rounded text-white placeholder-gray-500 uppercase font-mono tracking-wider focus:border-purple-500 outline-none"
              placeholder="ROOM CODE"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <button
              onClick={joinRoom}
              disabled={loading}
              className="w-full sm:w-auto bg-gray-800 hover:bg-gray-700 border border-gray-600 px-6 py-3 rounded font-bold transition-colors"
            >
              Infiltrate
            </button>
          </div>
          <button
            onClick={() => setShowRules(true)}
            className="w-full text-sm text-gray-400 hover:text-white flex items-center justify-center gap-2 py-2"
          >
            <BookOpen size={16} /> How to play
          </button>
        </div>
      </div>
    );
  }

  if (view === "lobby" && gameState) {
    const isHost = gameState.hostId === user.uid;
    const currentCards = gameState.startingCards || 2;

    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 relative">
        <FloatingBackground />

        <div className="z-10 w-full max-w-lg bg-gray-900/90 backdrop-blur p-8 rounded-2xl border border-purple-900/50 shadow-2xl">
          <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
            {/* UPDATED: Renamed Lobby to Back Room */}
            <h2 className="text-2xl font-serif text-purple-400">
              Back Room:{" "}
              <span className="text-white font-mono">{gameState.id}</span>
            </h2>
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="p-2 bg-red-900/30 hover:bg-red-900/50 rounded text-red-300"
              title="Leave Room"
            >
              <LogOut size={16} />
            </button>
          </div>

          {isHost && (
            <div className="bg-black/30 rounded-lg p-3 mb-6 border border-gray-700">
              <h3 className="text-purple-300 font-bold mb-2 uppercase text-xs tracking-wider">
                Protocol Settings
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Lives per Agent:</span>
                <div className="flex gap-2">
                  {[2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => updateSettings(num)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                        currentCards === num
                          ? "bg-purple-600 text-white shadow-lg"
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-black/20 rounded-xl p-4 mb-8 border border-gray-800">
            <h3 className="text-gray-500 text-xs uppercase tracking-wider mb-4 flex justify-between">
              <span>
                Operatives ({gameState.players.length}/{gameState.maxPlayers})
              </span>
              <span className="text-purple-400 font-bold">
                Mode: {currentCards} Lives
              </span>
            </h3>
            <div className="space-y-2">
              {gameState.players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-gray-800/50 p-3 rounded border border-gray-700/50"
                >
                  <span
                    className={`font-bold flex items-center gap-2 ${
                      p.id === user.uid ? "text-purple-400" : "text-gray-300"
                    }`}
                  >
                    <User
                      size={14}
                      className={
                        p.id === user.uid ? "text-purple-400" : "text-gray-500"
                      }
                    />
                    {p.name}
                    {p.id === gameState.hostId && (
                      <Crown size={14} className="text-yellow-500" />
                    )}
                  </span>
                  <span className="text-green-500 text-xs flex items-center gap-1">
                    <CheckCircle size={12} /> Ready
                  </span>
                </div>
              ))}
              {gameState.players.length < 2 && (
                <div className="text-center text-gray-500 italic text-sm py-2">
                  Waiting for more agents...
                </div>
              )}
            </div>
          </div>

          {isHost ? (
            <button
              onClick={startGame}
              disabled={gameState.players.length < 2}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                gameState.players.length >= 2
                  ? "bg-green-700 hover:bg-green-600 text-white shadow-green-900/20"
                  : "bg-gray-800 cursor-not-allowed text-gray-500"
              }`}
            >
              {gameState.players.length < 2
                ? "Awaiting Agents..."
                : "Commence Operation"}
            </button>
          ) : (
            <div className="text-center text-purple-400/60 animate-pulse font-serif italic">
              Waiting for Host command...
            </div>
          )}
        </div>
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
    if (!me) return null;

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

    // --- PRIORITY LOGIC: SHOW BUTTONS ---
    const act = gameState.currentAction;
    const isTargetedAction =
      act && (act.type === "STEAL" || act.type === "STAB");
    const targetHasPassed =
      isTargetedAction && act.votes.includes(act.targetId);
    const amITarget = isTargetedAction && act.targetId === user.uid;

    let showActionControls = false;
    if (
      gameState.turnState === "ACTION_PENDING" &&
      act.actorId !== user.uid &&
      !me.isEliminated
    ) {
      if (isTargetedAction) {
        if (!targetHasPassed) {
          if (amITarget) showActionControls = true;
        } else {
          if (!amITarget) showActionControls = true;
        }
      } else {
        showActionControls = true;
      }
    }

    const showBlockControls =
      gameState.turnState === "BLOCK_PENDING" &&
      gameState.currentAction.blockerId !== user.uid &&
      !me.isEliminated;
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
    let targetName = null;
    let actorName = null;
    if (act) {
      const targetP = gameState.players.find((p) => p.id === act.targetId);
      const actorP = gameState.players.find((p) => p.id === act.actorId);
      if (targetP) targetName = targetP.name;
      if (actorP) actorName = actorP.name;
    }

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
        loseCardTitle = `${loserName} lost a life`;
        loseCardSub = "Choosing card to lose...";
      }
    }

    const hideBottomControls = isExchanging || gameState.status === "finished";

    return (
      <div className="min-h-screen bg-gray-950 text-white overflow-hidden flex flex-col relative font-sans">
        <FloatingBackground />

        {showRules && <RulesModal onClose={() => setShowRules(false)} />}

        {/* Top Bar */}
        <div className="h-14 bg-gray-900/80 border-b border-gray-800 flex items-center justify-between px-4 z-50 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-2">
            <span className="font-serif text-purple-500 font-bold tracking-wider hidden md:block">
              CONSPIRACY
            </span>
            {/* UPDATED: Changed Room ID to 'Back Room' */}
            <span className="text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
              Back Room
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRules(true)}
              className="p-2 hover:bg-gray-800 rounded text-gray-400"
              title="Rules"
            >
              <BookOpen size={18} />
            </button>
            <button
              onClick={() => setShowLogHistory(true)}
              className="p-2 hover:bg-gray-800 rounded text-gray-400"
              title="History"
            >
              <History size={18} />
            </button>
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="p-2 hover:bg-red-900/50 rounded text-red-400"
              title="Leave Game"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 relative p-4 flex flex-col z-10 max-w-5xl mx-auto w-full">
          {/* REMOVED: Large Center Turn Indicator */}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 z-10">
            {gameState.players.map((p, i) => {
              if (p.id === user.uid) return null;
              return (
                <div
                  key={p.id}
                  className={`bg-gray-900/90 p-3 rounded-lg border transition-all ${
                    gameState.turnIndex === i
                      ? "border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                      : "border-gray-700"
                  } ${p.isEliminated ? "opacity-50 grayscale" : ""} relative`}
                >
                  {/* --- NEW: Playing Badge --- */}
                  {gameState.turnIndex === i && !p.isEliminated && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse border border-purple-400 tracking-wider z-30">
                      PLAYING
                    </div>
                  )}

                  {p.isEliminated && (
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-900/90 text-red-200 text-xs font-black uppercase tracking-widest text-center py-1 z-20 border-y border-red-500 rotate-12">
                      Terminated
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`font-bold text-sm truncate w-20 flex items-center gap-1 ${
                        gameState.turnIndex === i
                          ? "text-purple-300"
                          : "text-gray-300"
                      }`}
                    >
                      <User size={12} /> {p.name}
                    </span>
                    <div className="flex items-center space-x-1 bg-black/40 px-2 py-0.5 rounded-full border border-gray-700">
                      <Coins size={10} className="text-yellow-400" />
                      <span className="text-xs font-mono">{p.coins}</span>
                    </div>
                  </div>
                  <div className="flex justify-center space-x-1 mb-2">
                    {p.cards.map((c, idx) => (
                      <div
                        key={idx}
                        className={`w-6 h-9 rounded border ${
                          c.flipped
                            ? "bg-black border-gray-800"
                            : "bg-gradient-to-br from-purple-900 to-indigo-900 border-purple-700"
                        } flex items-center justify-center`}
                      >
                        {c.flipped ? (
                          <Skull size={10} className="text-gray-700" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-purple-500/50"></div>
                        )}
                      </div>
                    ))}
                  </div>
                  {isMyTurnBool &&
                    gameState.turnState === "IDLE" &&
                    !p.isEliminated && (
                      <div className="grid grid-cols-3 gap-1 mt-1">
                        <button
                          disabled={p.coins < 2}
                          onClick={() => handleAction("STEAL", p.id)}
                          className="disabled:opacity-20 bg-blue-900/40 border border-blue-800 hover:bg-blue-800 text-blue-300 py-1 rounded text-[9px] font-bold"
                        >
                          Steal
                        </button>
                        <button
                          disabled={me.coins < 3}
                          onClick={() => handleAction("STAB", p.id)}
                          className="disabled:opacity-20 bg-red-900/40 border border-red-800 hover:bg-red-800 text-red-300 py-1 rounded text-[9px] font-bold"
                        >
                          Stab(3)
                        </button>
                        <button
                          disabled={me.coins < 7}
                          onClick={() => handleAction("KILL", p.id)}
                          className="disabled:opacity-20 bg-gray-800 border border-red-900/50 hover:bg-red-950 text-red-500 py-1 rounded text-[9px] font-bold"
                        >
                          Kill(7)
                        </button>
                      </div>
                    )}
                  {gameState.currentAction?.votes.includes(p.id) &&
                    (gameState.turnState === "ACTION_PENDING" ||
                      gameState.turnState === "BLOCK_PENDING") && (
                      <div className="absolute -top-2 -right-2 z-20 text-green-400 bg-gray-900 rounded-full p-0.5 border border-green-500 shadow-lg">
                        <CheckCircle size={14} className="fill-current" />
                      </div>
                    )}
                </div>
              );
            })}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center my-2 space-y-4 z-10 relative">
            {gameState.status === "finished" && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 backdrop-blur-sm rounded-xl border border-purple-500/30">
                <Trophy
                  size={64}
                  className="text-yellow-400 mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                />
                <div className="text-4xl font-bold text-white mb-2 font-serif">
                  Victory
                </div>
                <div className="text-xl text-purple-400 mb-8">
                  Agent {alivePlayers[0]?.name} Survives
                </div>
                {gameState.hostId === user.uid ? (
                  <button
                    onClick={restartGame}
                    className="bg-green-700 hover:bg-green-600 px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-2 shadow-lg"
                  >
                    <RotateCcw /> New Operation
                  </button>
                ) : (
                  <div className="text-gray-500 animate-pulse text-sm">
                    Awaiting Host Reset...
                  </div>
                )}
              </div>
            )}

            {(gameState.turnState === "ACTION_PENDING" ||
              gameState.turnState === "LOSE_CARD") && (
              <div className="w-full max-w-md bg-gray-900/95 p-6 rounded-xl border border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.15)] relative animate-in zoom-in-95">
                <div className="text-center mb-6">
                  {gameState.turnState === "LOSE_CARD" ? (
                    <>
                      <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                        {loseCardTitle}
                      </div>
                      <div
                        className={`text-2xl font-black ${
                          gameState.loseReason === "challenge"
                            ? "text-red-500"
                            : "text-purple-400"
                        }`}
                      >
                        {loseCardSub}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">
                        Current Operation
                      </div>
                      <div className="text-xl font-bold text-white mb-2">
                        <span className="text-purple-400">
                          {getCurrentPlayer().name}
                        </span>{" "}
                        uses{" "}
                        <span className="text-yellow-400 uppercase">
                          {actionName}
                        </span>
                        {targetName && (
                          <span className="text-gray-400">
                            {" "}
                            on {targetName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-4 mb-1">
                        <span>Consensus</span>
                        <span>
                          {pendingVotes}/{neededVotes}
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full transition-all duration-300"
                          style={{
                            width: `${(pendingVotes / neededVotes) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </>
                  )}
                </div>

                {gameState.turnState === "ACTION_PENDING" &&
                  showActionControls &&
                  !me.isEliminated && (
                    <div className="grid grid-cols-2 gap-3">
                      {hasVoted ? (
                        <div className="col-span-2 bg-gray-800 py-3 text-center text-gray-400 text-sm rounded font-mono animate-pulse">
                          ... Awaiting Network ...
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={handlePass}
                            className="col-span-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 py-3 rounded font-bold text-white transition-all"
                          >
                            Allow / Pass
                          </button>
                          {act.type !== "EXPORT" && (
                            <button
                              onClick={() => handleChallenge(user.uid)}
                              className="bg-red-900/80 hover:bg-red-800 border border-red-700 py-3 rounded text-xs font-bold flex items-center justify-center gap-1 text-red-200 transition-all"
                            >
                              <XCircle size={14} /> Challenge Bluff
                            </button>
                          )}
                          {canIBlock && act.type === "EXPORT" && (
                            <button
                              onClick={() => handleBlock(user.uid, "HERO")}
                              className="bg-purple-700 hover:bg-purple-600 border border-purple-500 py-3 rounded text-xs font-bold"
                            >
                              Block (Hero)
                            </button>
                          )}
                          {canIBlock && act.type === "STEAL" && (
                            <>
                              <button
                                onClick={() => handleBlock(user.uid, "ROBBER")}
                                className="bg-blue-700 hover:bg-blue-600 border border-blue-500 py-3 rounded text-xs font-bold"
                              >
                                Block (Robber)
                              </button>
                              <button
                                onClick={() => handleBlock(user.uid, "RIDDLER")}
                                className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 py-3 rounded text-xs font-bold"
                              >
                                Block (Riddler)
                              </button>
                            </>
                          )}
                          {canIBlock && act.type === "STAB" && (
                            <button
                              onClick={() => handleBlock(user.uid, "GENIE")}
                              className="bg-pink-700 hover:bg-pink-600 border border-pink-500 py-3 rounded text-xs font-bold"
                            >
                              Block (Genie)
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                {gameState.turnState === "ACTION_PENDING" &&
                  !showActionControls && (
                    <div className="text-center text-xs text-purple-400/60 animate-pulse font-mono mt-4">
                      {isTargetedAction && !targetHasPassed ? (
                        <span>Target is deliberating...</span>
                      ) : (
                        <span>Waiting for consensus...</span>
                      )}
                    </div>
                  )}
              </div>
            )}

            {gameState.turnState === "BLOCK_PENDING" && (
              <div className="bg-gray-900 p-6 rounded-xl border border-purple-500 w-full max-w-md text-center shadow-2xl animate-in zoom-in-95">
                <div className="mb-4">
                  <span className="font-bold text-white">
                    {
                      gameState.players.find(
                        (p) => p.id === gameState.currentAction.blockerId
                      ).name
                    }
                  </span>{" "}
                  is blocking with{" "}
                  <span className="font-black text-purple-400 text-lg block mt-1">
                    {gameState.currentAction.blockClaim}
                  </span>
                </div>
                {showBlockControls && (
                  <div className="grid grid-cols-2 gap-3">
                    {gameState.currentAction.votes.includes(user.uid) ? (
                      <div className="col-span-2 text-gray-500 text-xs italic">
                        Processing...
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={handleAcceptBlock}
                          className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded font-bold"
                        >
                          Accept Block
                        </button>
                        <button
                          onClick={() => handleChallenge(user.uid)}
                          className="bg-red-600 hover:bg-red-500 text-white py-3 rounded font-bold shadow-red-900/20"
                        >
                          Challenge!
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {gameState.turnState === "CHALLENGE_RESOLVE" && (
              <div className="text-center w-full max-w-md animate-in fade-in slide-in-from-bottom-4">
                <div className="text-red-400 font-bold text-xs uppercase tracking-widest mb-2 bg-red-950/50 p-2 rounded border border-red-900">
                  Interrogation in Progress
                </div>
                {gameState.accusedId === user.uid ? (
                  <div className="bg-gray-900 p-6 rounded-xl border border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <div className="text-lg mb-6 font-medium text-gray-300">
                      Prove you possess the: <br />
                      <span className="text-3xl font-black text-yellow-400 uppercase tracking-wider block mt-2 drop-shadow-md">
                        {gameState.challengedCard}
                      </span>
                    </div>
                    <div className="flex justify-center gap-3 flex-wrap">
                      {me.cards.map((c, i) => {
                        if (c.flipped) return null;
                        if (c.type !== gameState.challengedCard) return null;
                        return (
                          <button
                            key={i}
                            onClick={() => resolveChallenge(i)}
                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-2"
                          >
                            <CheckCircle size={20} /> Reveal {c.type}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={handleSurrender}
                      className={`mt-8 text-sm uppercase tracking-wider font-bold transition-all p-2 rounded ${
                        me.cards.some(
                          (c) =>
                            !c.flipped && c.type === gameState.challengedCard
                        )
                          ? "text-gray-600 hover:text-gray-400"
                          : "text-red-400 hover:text-white hover:bg-red-900 border border-transparent hover:border-red-500"
                      }`}
                    >
                      I Admit Deception (Surrender)
                    </button>
                  </div>
                ) : (
                  <div className="text-sm animate-pulse text-gray-400 bg-gray-900/80 p-6 rounded-xl border border-gray-700">
                    Awaiting confession from{" "}
                    <span className="text-white font-bold">
                      {
                        gameState.players.find(
                          (p) => p.id === gameState.accusedId
                        )?.name
                      }
                    </span>
                    ...
                  </div>
                )}
              </div>
            )}

            {isExchanging && (
              <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
                {/* UPDATED: Added max-height and overflow for responsiveness */}
                <div className="w-full max-w-2xl bg-gray-900 p-6 rounded-2xl border border-emerald-500/50 shadow-2xl max-h-[85vh] overflow-y-auto">
                  <h3 className="text-2xl font-bold mb-2 text-emerald-400 font-serif sticky top-0 bg-gray-900/90 backdrop-blur pb-2 z-10">
                    The Riddler's Exchange
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Select exactly{" "}
                    <span className="text-white font-bold">
                      {me.cards.filter((c) => !c.flipped).length}
                    </span>{" "}
                    cards to keep.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                      ...me.cards.filter((c) => !c.flipped).map((c) => c.type),
                      ...gameState.tempCards,
                    ].map((cardType, i) => (
                      <div key={i}>
                        <CardView
                          type={cardType}
                          flipped={false}
                          selected={exchangeSelection.includes(i)}
                          selectable={true}
                          onClick={() => {
                            const newSel = [...exchangeSelection];
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
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={finishExchange}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
                    disabled={
                      exchangeSelection.length !==
                      me.cards.filter((c) => !c.flipped).length
                    }
                  >
                    Confirm Selection
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isExchanging && gameState.status !== "finished" && (
            <div className="w-full max-w-md mx-auto mb-2 flex flex-col items-center space-y-1 pointer-events-none z-20 h-16 justify-end">
              {gameState.logs
                ?.slice(-2)
                .reverse()
                .map((log, i) => (
                  <div
                    key={i}
                    className={`text-xs px-3 py-1.5 rounded bg-black/80 backdrop-blur-md border border-gray-800 text-gray-300 shadow-lg transition-opacity duration-500`}
                    style={{ opacity: Math.max(0.4, 0.9 - i * 0.3) }}
                  >
                    {log.text}
                  </div>
                ))}
            </div>
          )}

          {!hideBottomControls &&
            (!me.isEliminated ? (
              <div
                className={`mt-auto bg-gray-900/95 backdrop-blur-md p-4 rounded-t-2xl border-t border-purple-500/30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] relative z-30 transition-all ${
                  gameState.turnState === "LOSE_CARD" &&
                  gameState.loserId === user.uid
                    ? "ring-2 ring-red-500 shadow-red-900/20"
                    : ""
                }`}
              >
                <div className="grid grid-cols-3 items-center mb-4">
                  {/* Left: Name + Icon */}
                  <div className="flex items-center gap-2 justify-start">
                    <User size={16} className="text-purple-400" />
                    <span className="text-sm font-bold text-gray-300 truncate">
                      {me.name}
                    </span>
                  </div>

                  {/* Middle: Turn Indicator or Warning */}
                  <div className="flex justify-center">
                    {gameState.turnState === "LOSE_CARD" &&
                    gameState.loserId === user.uid ? (
                      <div className="text-red-400 font-black text-[10px] md:text-xs animate-bounce bg-red-900/20 px-2 py-1 rounded border border-red-500/50 whitespace-nowrap">
                        ⚠️ SACRIFICE
                      </div>
                    ) : (
                      isMyTurnBool &&
                      gameState.turnState === "IDLE" && (
                        <span className="bg-green-600 text-white text-[10px] md:text-xs font-bold px-3 py-0.5 rounded-full shadow-lg animate-bounce border border-green-400 tracking-wider whitespace-nowrap">
                          YOUR TURN
                        </span>
                      )
                    )}
                  </div>

                  {/* Right: Coins */}
                  <div className="flex justify-end">
                    <div className="bg-yellow-600/20 border border-yellow-600/50 text-yellow-500 px-3 py-1 rounded-full font-bold text-sm flex items-center shadow-sm">
                      <Coins size={14} className="mr-1.5" /> {me.coins}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center space-x-3 mb-6 perspective-1000">
                  {me.cards.map((c, i) => (
                    <div
                      key={i}
                      className={`transition-transform hover:-translate-y-2 duration-300 ${
                        gameState.turnState === "LOSE_CARD" &&
                        gameState.loserId === user.uid &&
                        !c.flipped
                          ? "animate-pulse cursor-pointer"
                          : ""
                      }`}
                    >
                      <CardView
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
                    </div>
                  ))}
                </div>

                {isMyTurnBool && gameState.turnState === "IDLE" && (
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleAction("EARN")}
                      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 p-2 rounded-lg flex flex-col items-center transition-colors group"
                    >
                      <Coins
                        size={20}
                        className="text-gray-400 group-hover:text-yellow-200 mb-1"
                      />
                      <span className="text-[10px] text-gray-400 group-hover:text-white font-bold">
                        Income (+1)
                      </span>
                    </button>
                    <button
                      onClick={() => handleAction("EXPORT")}
                      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 p-2 rounded-lg flex flex-col items-center transition-colors group"
                    >
                      <DoorOpen
                        size={20}
                        className="text-blue-400/70 group-hover:text-blue-300 mb-1"
                      />
                      <span className="text-[10px] text-gray-400 group-hover:text-white font-bold">
                        Export (+2)
                      </span>
                    </button>
                    <button
                      onClick={() => handleAction("TAX")}
                      className="bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800/50 p-2 rounded-lg flex flex-col items-center transition-colors group"
                    >
                      <Crown size={20} className="text-purple-400 mb-1" />
                      <span className="text-[10px] text-purple-300 font-bold">
                        Hero (+3)
                      </span>
                    </button>
                    <button
                      onClick={() => handleAction("EXCHANGE")}
                      className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-800/50 p-2 rounded-lg flex flex-col items-center transition-colors group"
                    >
                      <RefreshCcw size={20} className="text-emerald-400 mb-1" />
                      <span className="text-[10px] text-emerald-300 font-bold">
                        Exchange
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-950/80 backdrop-blur-sm p-6 text-center border-t border-red-800 text-red-500 font-black tracking-widest z-30 relative shadow-[0_-10px_50px_rgba(220,38,38,0.3)]">
                ELIMINATED
              </div>
            ))}
        </div>

        <div className="bg-gray-950 pb-1 pt-1 z-50">
          <ConspiracyLogo />
        </div>
        {showLeaveConfirm && (
          <LeaveConfirmModal
            onConfirm={handleLeaveRoom}
            onCancel={() => setShowLeaveConfirm(false)}
          />
        )}
        {showLogHistory && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-md h-[70vh] flex flex-col border border-gray-700 shadow-2xl">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950 rounded-t-2xl">
                <h3 className="font-bold text-white flex items-center gap-2 font-serif">
                  <History size={18} className="text-purple-500" /> Mission Log
                </h3>
                <button onClick={() => setShowLogHistory(false)}>
                  <X className="text-gray-400 hover:text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {[...(gameState.logs || [])].reverse().map((log, i) => (
                  <div
                    key={i}
                    className={`text-xs p-3 rounded border-l-2 ${
                      log.type === "danger"
                        ? "bg-red-900/10 border-red-500 text-red-300"
                        : log.type === "success"
                        ? "bg-green-900/10 border-green-500 text-green-300"
                        : log.type === "warning"
                        ? "bg-yellow-900/10 border-yellow-500 text-yellow-300"
                        : "bg-gray-800 border-gray-600 text-gray-400"
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
//final done