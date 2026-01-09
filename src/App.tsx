import { useState, useRef } from 'react'
import { Mic, Square, Database, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import './index.css'

type ChatStatus = 'idle' | 'listening' | 'thinking' | 'speaking'

function App() {
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [transcription, setTranscription] = useState<string>('')
  const [dbResults, setDbResults] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data)
      }

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' })
        await processAudio(audioBlob)
      }

      mediaRecorder.current.start()
      setIsRecording(true)
      setStatus('listening')
    } catch (err) {
      console.error("Error accessing microphone:", err)
      alert("Please allow microphone access to use the voice bot.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      setIsRecording(false)
      setStatus('thinking')
    }
  }

  const processAudio = async (blob: Blob) => {
    const formData = new FormData()
    formData.append('audio', blob)

    try {
      setStatus('thinking')
      const response = await axios.post('http://localhost:8000/chat', formData)

      const { transcription: transcribedText, response: aiText, db_data } = response.data

      setTranscription(transcribedText)
      setDbResults(db_data ? `Result: ${db_data}` : "No specific data returned from MariaDB.")

      // Play AI Response via TTS
      playTTS(aiText)

      setStatus('speaking')
      setTimeout(() => setStatus('idle'), 5000)

    } catch (err: any) {
      console.error("Error processing audio:", err)
      setStatus('idle')
      alert(`Error: ${err.message}. Make sure the backend is running at http://localhost:8000`)
    }
  }

  const playTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel() // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <div className={`main-container ${status}`}>
      <header className="header">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ERPNext Voice Assistant
        </motion.h1>
        <p>Voice-driven AI insights powered by MariaDB</p>
      </header>

      <div className="orb-container" onClick={isRecording ? stopRecording : startRecording}>
        <div className="orb-outer" />
        <motion.div
          className="orb-inner"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {status === 'listening' ? <Square fill="white" /> : <Mic size={48} />}
        </motion.div>
      </div>

      <div className="status-indicator">
        <AnimatePresence mode="wait">
          <motion.p
            key={status}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="status-text"
          >
            {status === 'idle' && "Click to Start"}
            {status === 'listening' && "Listening..."}
            {status === 'thinking' && "Analyzing Data..."}
            {status === 'speaking' && "Providing Insights..."}
          </motion.p>
        </AnimatePresence>
      </div>

      <motion.div
        className="data-panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3><MessageSquare size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Conversation Trace</h3>
        <p className="transcription">
          {transcription || "Your request will appear here..."}
        </p>

        <h3><Database size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> ERPNext Data</h3>
        <pre className="query-results">
          {dbResults || "MariaDB query results will be displayed here."}
        </pre>
      </motion.div>

      <footer style={{ marginTop: 'auto', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '1.5rem' }}>
        <p>Connected to MariaDB • Secured with ERPNext Auth</p>
      </footer>
    </div>
  )
}

export default App
