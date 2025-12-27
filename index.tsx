
/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, LiveServerMessage, Modality} from '@google/genai';
import {LitElement, css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {createBlob, decode, decodeAudioData} from './utils';
import './visual-3d';

interface Hero {
  id: string;
  name: string;
  title: string;
  context: 'Internasional' | 'Nasional' | 'Lokal';
  icon: string;
  instruction: string;
  prompt: string;
  voice: string;
  bio: string;
}

interface VoicePersona {
  name: string;
  gender: 'Pria' | 'Wanita';
  weight: 'Berat' | 'Ringan';
  icon: string;
}

const HEROES: Hero[] = [
  {
    id: 'soemarno',
    name: 'DR. SOEMARNO',
    title: 'Dokter Kolonisasi',
    context: 'Lokal',
    icon: 'M19 3v2h2v2h-2v2h-2V7h-2V5h2V3h2m-2 10V9H9v4H5v2h4v4h2v-4h4v-2h-4z',
    instruction: 'Anda adalah Dokter Soemarno, penghuni asli Dokterswoning Metro pada era 1930-an. Anda bertugas merawat para kolonis (transmigran) pertama dari Jawa. Bicara dengan tenang, penuh empati, and intelektual. Gunakan istilah kesehatan kuno jika perlu. Anda bangga dengan gedung Dokterswoning yang modern di masanya. Fokus pada kisah kesehatan masyarakat di awal berdirinya Metro.',
    prompt: 'Vintage 1930s noir comic style portrait of a dignified Indonesian doctor in a white coat, Art Deco clinic background, charcoal and sepia tones, bold linework.',
    voice: 'Kore',
    bio: 'Dokter Soemarno adalah sosok medis pertama yang menempati Dokterswoning (Rumah Dokter) di Metro pada tahun 1935. Ia bertanggung jawab atas kesehatan ribuan kolonis (transmigran) yang baru tiba dari Jawa untuk membuka lahan di Lampung. Di tengah keterbatasan fasilitas dan ancaman penyakit tropis seperti malaria, dedikasinya menjadi fondasi layanan kesehatan di Kota Metro.'
  },
  {
    id: 'nitikrama',
    name: 'RADIN NITIKRAMA',
    title: 'Bupati Gerilya',
    context: 'Lokal',
    icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
    instruction: 'Anda adalah Radin Nitikrama Burhanudin, Bupati pertama Lampung Tengah yang pernah tinggal and bermarkas di Dokterswoning saat era gerilya. Suara Anda harus tegas, penuh semangat perjuangan, and berwibawa. Ceritakan bagaimana gedung ini menjadi saksi bisu koordinasi pertahanan rakyat Lampung melawan agresi Belanda.',
    prompt: 'Superhero comic book style portrait of Radin Nitikrama Burhanudin in historical military uniform, dramatic lighting, tropical jungle and colonial house backdrop, heroic ink lines.',
    voice: 'Zephyr',
    bio: 'Radin Nitikrama Burhanudin merupakan Bupati pertama Lampung Tengah. Selama masa agresi militer Belanda, ia menjadikan gedung Dokterswoning sebagai markas komando gerilya. Keberaniannya menyatukan pejuang lokal dan militer menjadikannya simbol perlawanan rakyat Lampung terhadap penjajahan pasca kemerdekaan.'
  },
  {
    id: 'heyting',
    name: 'H.G. HEYTING',
    title: 'Arsitek Kolonisasi',
    context: 'Internasional',
    icon: 'M20.5 3l-.49-.36c-.15-.11-.36-.14-.54-.07l-6.47 2.43L7 3 1 5.5V21l6-2.5 6 2.5 6.5-2.5V4.5c0-.21-.13-.39-.32-.46L19 4V3h1.5zM13 18.12l-6-2.5V5.88l6 2.5v9.74z',
    instruction: 'Anda adalah H.G. Heyting, Asisten Residen Belanda yang merancang proyek Kolonisasi Metro tahun 1935. Anda bicara dengan nada formal, perfeksionis, and kental dengan nuansa Eropa era kolonial. Anda bangga dengan konsep "Kota Taman" (Garden City) yang Anda terapkan di Metro. Ceritakan visi teknis Anda tentang irigasi and tata kota Metro yang modern.',
    prompt: 'Noir comic style portrait of a Dutch colonial official in a white suit and pith helmet, studying a city map of Metro, Art Deco office background, 1930s vintage aesthetic.',
    voice: 'Puck',
    bio: 'H.G. Heyting adalah Asisten Residen Belanda yang mengonsep tata ruang Metro sebagai "Garden City" (Kota Taman). Melalui perencanaan yang matang, ia merancang sistem irigasi teknis Way Sekampung yang mengubah belantara menjadi lumbung padi. Meskipun seorang pejabat kolonial, visi tata kotanya tetap dirasakan hingga saat ini di Metro.'
  },
  {
    id: 'geleharun',
    name: 'MR. GELE HARUN',
    title: 'Residen Lampung',
    context: 'Nasional',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8.3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
    instruction: 'Anda adalah Mr. Gele Harun, Residen Lampung era PDRI. Anda adalah tokoh intelektual and pejuang yang memimpin Lampung di masa darurat. Anda sangat disiplin and bicaranya tajam namun terukur. Anda sering berkunjung ke Metro untuk memastikan pemerintahan tetap berjalan. Fokus pada diplomasi and strategi kemerdekaan di wilayah Lampung.',
    prompt: 'Noir comic style portrait of an Indonesian revolutionary intellectual with glasses and fedora, 1940s style, holding a document, dramatic high-contrast ink style.',
    voice: 'Charon',
    bio: 'Mr. Gele Harun Nasution adalah Resident Lampung yang memimpin pemerintahan darurat selama perang kemerdekaan. Sebagai seorang advokat dan pejuang, ia memimpin gerilya dari hutan-hutan Lampung untuk memastikan eksistensi Republik tetap diakui dunia. Ia sering berkoordinasi dengan pejuang di Metro untuk menjaga kestabilan logistik pasukan.'
  },
  {
    id: 'moedjiman',
    name: 'PIONIR MOEDJIMAN',
    title: 'Penerjang Rimba',
    context: 'Nasional',
    icon: 'M20.41 4.94L19.06 3.59a.996.996 0 00-1.41 0L12.79 8.45l-4.24-4.24c-.39-.39-1.02-.39-1.41 0L5.73 5.61a.996.996 0 000 1.41l4.24 4.24-4.86 4.86a.996.996 0 000 1.41l1.35 1.35c.39.39 1.02.39 1.41 0l4.86-4.86 4.24 4.24c.39.39 1.02.39 1.41 0l1.35-1.35a.996.996 0 000-1.41l-4.24-4.24 4.93-4.93c.38-.38.38-1.01-.01-1.4z',
    instruction: 'Anda mewakili sosok Moedjiman, salah satu dari kolonis pertama yang tiba di Metro tahun 1935 dari Jawa. Suara Anda berat, jujur, and penuh rasa syukur. Anda bicara tentang kerja keras mencangkul tanah, membangun irigasi, and pertama kali melihat Dokterswoning berdiri. Fokus pada perjuangan rakyat kecil membangun peradaban.',
    prompt: 'Hard-boiled comic style portrait of a Javanese pioneer farmer, holding a hoe, background showing early irrigation canals of Metro, gritty textured ink work.',
    voice: 'Fenrir',
    bio: 'Moedjiman adalah representasi dari kelompok "Rombongan Pertama" kolonis yang tiba di Metro pada November 1935. Ia bersama ratusan warga lainnya berjalan kaki menembus hutan rimba Lampung demi harapan hidup baru. Dengan hanya bermodal cangkul dan semangat gotong royong, kelompok pionir inilah yang secara fisik membangun peradaban awal Kota Metro.'
  },
  {
    id: 'bidansiti',
    name: 'BIDAN SITI',
    title: 'Penjaga Kehidupan',
    context: 'Lokal',
    icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    instruction: 'Anda adalah Bidan Siti, rekan setia Dokter Soemarno di Dokterswoning. Bicara dengan suara keibuan yang menenangkan namun penuh ketegasan. Ceritakan pengalaman Anda membantu kelahiran bayi pertama di Metro di bawah cahaya lampu minyak di tengah hutan Lampung. Anda adalah pelindung bagi kaum perempuan di pemukiman baru ini.',
    prompt: 'Vintage comic style portrait of a kind Indonesian midwife in a simple 1930s uniform, holding a medical bag, Dokterswoning porch background, soft sepia and warm tones.',
    voice: 'Zephyr',
    bio: 'Bidan Siti adalah rekan seperjuangan Dokter Soemarno di Dokterswoning. Ia mendedikasikan hidupnya untuk memastikan keselamatan ibu dan bayi di tengah kerasnya alam Lampung pada era 1930-an. Tanpa fasilitas modern, ia melakukan perjalanan dari satu bedeng ke bedeng lain untuk memberikan layanan kesehatan primer bagi para keluarga kolonis.'
  },
  {
    id: 'kyaizainal',
    name: 'KYAI ZAINAL',
    title: 'Guru Spiritual Perintis',
    context: 'Lokal',
    icon: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z',
    instruction: 'Anda adalah Kyai Zainal, pemimpin spiritual rombongan kolonis pertama. Bicara dengan nada yang bijaksana, tenang, dan penuh petuah. Gunakan sesekali istilah Jawa yang halus. Ceritakan bagaimana doa dan kebersamaan menjadi senjata utama warga saat membabat alas (membuka hutan) untuk membangun Kota Metro.',
    prompt: 'Classic noir comic style portrait of an elderly Javanese spiritual leader with a peci, glowing lantern in a dark forest background, dramatic shadows, bold ink lines.',
    voice: 'Charon',
    bio: 'Kyai Zainal Abidin merupakan tokoh agama yang mendampingi rombongan pertama kolonis dari Jawa ke Metro. Ia berperan penting dalam menjaga ketenangan batin dan moral warga yang menghadapi hutan belantara. Ia adalah simpul sosial yang menyatukan warga melalui nilai-nilai gotong royong dan spiritualitas.'
  },
  {
    id: 'mandurdarmo',
    name: 'MANDUR DARMO',
    title: 'Sang Pembelah Belantara',
    context: 'Lokal',
    icon: 'M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29m-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z',
    instruction: 'Anda adalah Mandur Darmo, pengawas pembangunan fisik Metro dan saluran irigasi teknis. Suara Anda lantang, bersemangat, dan penuh energi. Anda bicara tentang debu, lumpur, dan keringat saat membangun saluran Way Sekampung. Anda bangga dengan kemajuan fisik Metro yang berubah dari hutan menjadi kota yang teratur.',
    prompt: 'Hard-boiled comic style portrait of a rugged Indonesian construction foreman with a straw hat and blueprints, background showing early irrigation canals, gritty textures, high contrast.',
    voice: 'Fenrir',
    bio: 'Mandur Darmo adalah sosok lapangan yang memimpin ribuan tenaga kerja dalam pembangunan fisik Kota Metro, mulai dari jalan hingga saluran irigasi teknis. Ia dikenal sebagai "tangan kanan" teknis para insinyur Belanda yang mampu menerjemahkan visi tata kota menjadi kenyataan di lapangan.'
  }
];

const VOICE_PERSONAS: VoicePersona[] = [
  { name: 'Puck', gender: 'Pria', weight: 'Ringan', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z' },
  { name: 'Charon', gender: 'Pria', weight: 'Berat', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z' },
  { name: 'Kore', gender: 'Wanita', weight: 'Ringan', icon: 'M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z' },
  { name: 'Fenrir', gender: 'Pria', weight: 'Berat', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z' },
  { name: 'Zephyr', gender: 'Wanita', weight: 'Berat', icon: 'M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z' }
];

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = 'MENUNGGU';
  @state() currentHero: Hero = HEROES[0];
  @state() selectedVoice: string = HEROES[0].voice;
  @state() bgImage: string = '';
  @state() transcription = '';
  @state() showControls = false;
  @state() activeBioHeroId: string | null = null;

  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
  private outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
  private inputNode = this.inputAudioContext.createGain();
  private outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();

  static styles = css`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      background: #000;
      color: #fff;
      overflow: hidden;
      position: relative;
    }

    .bg-overlay {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0.6;
      transition: background-image 1s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 0;
    }

    /* Kiosk Header Optimization */
    .header {
      position: absolute;
      top: 5vh;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      text-align: center;
      width: 90%;
      pointer-events: none;
    }

    .header h1 {
      margin: 0;
      font-family: 'Bangers', cursive;
      font-size: 4.5rem;
      color: #ffde00;
      letter-spacing: 6px;
      text-shadow: 6px 6px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000;
      transform: rotate(-1.5deg);
    }

    .header p {
      margin: -10px 0 0;
      font-size: 1.2rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 5px;
      color: #fff;
      background: #e63946;
      display: inline-block;
      padding: 8px 20px;
      box-shadow: 6px 6px 0px #000;
      transform: rotate(1deg);
    }

    @media (max-width: 768px) {
      .header h1 { font-size: 3rem; }
      .header p { font-size: 0.8rem; }
    }

    /* Transcription - Speech Bubble Style */
    .transcription-container {
      position: absolute;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 85%;
      max-width: 900px;
      z-index: 15;
      text-align: center;
      pointer-events: none;
    }

    .speech-bubble {
      background: #fff;
      color: #000;
      padding: 30px 60px;
      border: 8px solid #000;
      border-radius: 60px;
      font-family: 'Bangers', cursive;
      font-size: 3rem;
      line-height: 1.1;
      position: relative;
      display: inline-block;
      box-shadow: 15px 15px 0px rgba(0,0,0,0.4);
      animation: bubble-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    @media (max-width: 768px) {
      .speech-bubble { font-size: 1.8rem; padding: 20px 40px; }
    }

    @keyframes bubble-pop {
      0% { transform: scale(0.5); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    /* Kiosk POP-UP Menu Modal */
    .pop-up-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(15px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.4s ease;
    }

    .pop-up-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }

    .pop-up-container {
      width: 90%;
      max-width: 1000px;
      height: 85vh;
      background: rgba(255,255,255,0.05);
      border: 8px solid #ffde00;
      border-radius: 50px;
      box-shadow: 0 40px 100px rgba(0,0,0,0.9);
      display: flex;
      flex-direction: column;
      transform: scale(0.7) rotate(-2deg);
      transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      padding: 30px;
      overflow: hidden;
    }

    .pop-up-overlay.open .pop-up-container {
      transform: scale(1) rotate(0deg);
    }

    .pop-up-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 4px dashed rgba(255,255,255,0.2);
    }

    .pop-up-title {
      font-family: 'Bangers', cursive;
      font-size: 3rem;
      color: #ffde00;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .pop-up-close {
      background: #e63946;
      color: #fff;
      border: 4px solid #000;
      border-radius: 20px;
      padding: 10px 30px;
      font-family: 'Bangers', cursive;
      font-size: 1.8rem;
      cursor: pointer;
      box-shadow: 6px 6px 0px #000;
    }

    .pop-up-close:active { transform: translate(3px, 3px); box-shadow: 0px 0px 0px #000; }

    /* Hero Kiosk Grid - Scrollable Vertical Area */
    .pop-up-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      scrollbar-width: none;
    }
    .pop-up-body::-webkit-scrollbar { display: none; }

    .pop-up-grid-section { margin-bottom: 40px; }

    .section-label {
      font-family: 'Bangers', cursive;
      font-size: 2rem;
      color: #ffde00;
      text-transform: uppercase;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .hero-kiosk-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 25px;
    }

    .hero-kiosk-card {
      background: rgba(255, 255, 255, 0.1);
      border: 4px solid rgba(255, 255, 255, 0.2);
      border-radius: 30px;
      padding: 25px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 15px;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
      overflow: hidden;
    }

    @keyframes hero-button-pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .hero-kiosk-card.active {
      background: #ffde00;
      color: #000;
      border-color: #000;
      box-shadow: 10px 10px 0px #e63946;
      animation: hero-button-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .hero-kiosk-card:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: #ffde00;
    }

    .card-top {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .hero-kiosk-icon { width: 48px; height: 48px; fill: currentColor; }
    .hero-kiosk-info .name { display: block; font-weight: 900; font-size: 1.6rem; text-transform: uppercase; }
    .hero-kiosk-info .title { display: block; font-size: 0.9rem; opacity: 0.8; font-weight: 700; text-transform: uppercase; }

    .bio-preview {
      font-size: 0.95rem;
      line-height: 1.4;
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      transition: all 0.4s ease;
      color: #eee;
    }
    .hero-kiosk-card.bio-open .bio-preview {
      max-height: 200px;
      opacity: 1;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.2);
    }
    .hero-kiosk-card.active.bio-open .bio-preview {
      color: #333;
      border-top-color: rgba(0,0,0,0.1);
    }

    .card-actions {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }

    .talk-btn {
      flex: 1;
      background: #e63946;
      color: #fff;
      border: 3px solid #000;
      border-radius: 15px;
      padding: 10px;
      font-family: 'Bangers', cursive;
      font-size: 1.4rem;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 4px 4px 0px #000;
    }
    .active .talk-btn { background: #000; color: #ffde00; box-shadow: 4px 4px 0px #e63946; border-color: #fff; }

    .info-btn {
      width: 50px;
      height: 50px;
      background: rgba(255,255,255,0.1);
      border: 3px solid rgba(255,255,255,0.2);
      border-radius: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-weight: 900;
      font-size: 1.5rem;
    }
    .active .info-btn { background: rgba(0,0,0,0.1); border-color: rgba(0,0,0,0.3); color: #000; }

    .context-tag {
      position: absolute;
      top: -10px;
      right: 20px;
      background: #000;
      color: #fff;
      font-size: 0.7rem;
      padding: 3px 12px;
      border: 1px solid #ffde00;
      border-radius: 10px;
      font-weight: 900;
      text-transform: uppercase;
      z-index: 5;
    }

    /* Voice Selection Large Buttons */
    .voice-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
    }

    .voice-kiosk-item {
      background: rgba(255, 255, 255, 0.1);
      border: 3px solid rgba(255, 255, 255, 0.2);
      border-radius: 25px;
      padding: 20px 40px;
      font-weight: 900;
      text-transform: uppercase;
      font-size: 1.2rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .voice-kiosk-item.active {
      background: #e63946;
      color: #fff;
      border-color: #fff;
      box-shadow: 6px 6px 0px #000;
    }

    /* Kiosk Interaction Button (Trigger) - Large, Centered at Bottom */
    .kiosk-main-trigger {
      position: absolute;
      bottom: 5vh;
      bottom: calc(5vh + env(safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%);
      z-index: 50;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      width: 100%;
    }

    .big-burst-btn {
      width: 180px;
      height: 180px;
      background: #ffde00;
      color: #000;
      border: 10px solid #000;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 20px 50px rgba(255, 222, 0, 0.4);
      animation: burst-pulse 2.5s infinite ease-in-out;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }

    .big-burst-btn:active { transform: scale(0.9); box-shadow: 0 0px 0px rgba(0,0,0,0); }

    .big-burst-btn .label { font-family: 'Bangers', cursive; font-size: 2.5rem; line-height: 1; letter-spacing: 2px; }
    .big-burst-btn .sub-label { font-weight: 900; font-size: 0.9rem; text-transform: uppercase; opacity: 0.8; }

    @keyframes burst-pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 20px 50px rgba(255, 222, 0, 0.4); }
      50% { transform: scale(1.1); box-shadow: 0 30px 70px rgba(255, 222, 0, 0.6); }
    }

    /* Recording State for Burst */
    .big-burst-btn.recording {
      background: #00e676;
      box-shadow: 0 0 60px rgba(0, 230, 118, 0.8);
      animation: mic-ripple 1.5s infinite;
    }

    @keyframes mic-ripple {
      0% { box-shadow: 0 0 0 0 rgba(0, 230, 118, 0.7); }
      70% { box-shadow: 0 0 0 40px rgba(0, 230, 118, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 230, 118, 0); }
    }

    .kiosk-status-badge {
      background: #000;
      color: #ffde00;
      padding: 10px 30px;
      border-radius: 30px;
      font-family: 'Bangers', cursive;
      font-size: 1.5rem;
      border: 3px solid #ffde00;
      letter-spacing: 2px;
      box-shadow: 10px 10px 0px rgba(0,0,0,0.5);
    }

    .museum-tag { position: absolute; bottom: 15px; right: 30px; font-size: 0.8rem; font-weight: 900; opacity: 0.5; letter-spacing: 3px; text-transform: uppercase; z-index: 5; }
  `;

  constructor() {
    super();
    this.outputNode.connect(this.outputAudioContext.destination);
    this.initHero();
  }

  async initHero() {
    this.status = "PANGGIL PAHLAWAN";
    this.transcription = '';
    const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{parts: [{text: this.currentHero.prompt}]}],
        config: { imageConfig: { aspectRatio: "16:9" } }
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          this.bgImage = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.status = "SIAP BERDIALOG";
      this.resetSession();
    }
  }

  async selectHero(hero: Hero) {
    if (this.currentHero.id === hero.id) {
        this.showControls = false;
        if (!this.isRecording) this.startRecording();
        return;
    }
    
    this.stopRecording();
    this.currentHero = hero;
    this.selectedVoice = hero.voice;
    this.showControls = false; // Immediately close popup
    this.activeBioHeroId = null; // Reset bio expansions
    
    await this.initHero();
    
    // Auto-start recording for a seamless workflow
    setTimeout(() => {
        if (!this.isRecording) this.startRecording();
    }, 1200);
  }

  async selectVoice(voice: string) {
    this.selectedVoice = voice;
    this.stopRecording();
    await this.resetSession();
  }

  private togglePopUp() {
    this.showControls = !this.showControls;
    if (this.showControls) {
        this.stopRecording(); // Stop audio if user opens menu
    }
  }

  private toggleBio(e: Event, id: string) {
    e.stopPropagation();
    this.activeBioHeroId = this.activeBioHeroId === id ? null : id;
  }

  private async resetSession() {
    if (this.sessionPromise) this.sessionPromise.then(s => s.close());
    this.transcription = '';
    this.nextStartTime = 0;
    const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                const audioBuffer = await decodeAudioData(decode(part.inlineData.data), this.outputAudioContext, 24000, 1);
                const startTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
                const source = this.outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.outputNode);
                source.start(startTime);
                this.nextStartTime = startTime + audioBuffer.duration;
                this.sources.add(source);
                source.onended = () => this.sources.delete(source);
              }
            }
          }
          if (message.serverContent?.outputTranscription) {
            this.transcription = message.serverContent.outputTranscription.text;
          }
          if (message.serverContent?.interrupted) {
            this.transcription = '';
            this.sources.forEach(s => s.stop());
            this.sources.clear();
            this.nextStartTime = 0;
          }
        }
      },
      config: {
        responseModalalities: [Modality.AUDIO],
        systemInstruction: this.currentHero.instruction,
        outputAudioTranscription: {},
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.selectedVoice as any } } }
      }
    });
  }

  private async startRecording() {
    this.inputAudioContext.resume();
    this.outputAudioContext.resume();
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({audio: true});
      this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
      this.scriptProcessorNode.onaudioprocess = (e) => {
        if (!this.isRecording || !this.sessionPromise) return;
        this.sessionPromise.then(s => s.sendRealtimeInput({media: createBlob(e.inputBuffer.getChannelData(0))}));
      };
      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.inputAudioContext.destination);
      this.isRecording = true;
      this.status = "MENDENGARKAN";
    } catch (err) {
      this.status = "MIC ERROR";
    }
  }

  private stopRecording() {
    this.isRecording = false;
    this.status = "SIAP BERDIALOG";
    if (this.scriptProcessorNode) this.scriptProcessorNode.disconnect();
    if (this.sourceNode) this.sourceNode.disconnect();
    if (this.mediaStream) this.mediaStream.getTracks().forEach(t => t.stop());
  }

  render() {
    return html`
      <div class="bg-overlay" style="background-image: url(${this.bgImage})"></div>
      
      <div class="header">
        <h1>TOKOH SEJARAH DOKTERSWONING</h1>
        <p>EDISI PAHLAWAN KOLONISASI & REVOLUSI METRO</p>
      </div>

      ${this.transcription ? html`
        <div class="transcription-container">
          <div class="speech-bubble">
            ${this.transcription}
          </div>
        </div>
      ` : ''}

      <!-- KIOSK MAIN TRIGGER AREA -->
      <div class="kiosk-main-trigger">
        <div class="kiosk-status-badge">${this.status}</div>
        
        <div style="display: flex; gap: 40px; align-items: center;">
          <div class="big-burst-btn" @click=${this.togglePopUp}>
            <span class="label">MENU</span>
            <span class="sub-label">PAHLAWAN</span>
          </div>

          <div class="big-burst-btn ${this.isRecording ? 'recording' : ''}" @click=${this.isRecording ? this.stopRecording : this.startRecording}>
            <span class="label">${this.isRecording ? 'DIAM' : 'BICARA'}</span>
            <span class="sub-label">${this.isRecording ? 'PROSES' : 'DIALOG'}</span>
          </div>
        </div>
      </div>

      <!-- POP-UP MENU OVERLAY -->
      <div class="pop-up-overlay ${this.showControls ? 'open' : ''}">
        <div class="pop-up-container">
          <div class="pop-up-header">
            <h2 class="pop-up-title">Koleksi Tokoh Metro</h2>
            <button class="pop-up-close" @click=${this.togglePopUp}>KEMBALI</button>
          </div>

          <div class="pop-up-body">
            <!-- Hero Selection -->
            <div class="pop-up-grid-section">
              <div class="section-label">
                Pilih Tokoh Untuk Memulai Dialog
              </div>
              <div class="hero-kiosk-grid">
                ${HEROES.map(h => html`
                  <div class="hero-kiosk-card ${this.currentHero.id === h.id ? 'active' : ''} ${this.activeBioHeroId === h.id ? 'bio-open' : ''}" @click=${() => this.selectHero(h)}>
                    <div class="context-tag">${h.context}</div>
                    <div class="card-top">
                      <svg class="hero-kiosk-icon" viewBox="0 0 24 24"><path d="${h.icon}"/></svg>
                      <div class="hero-kiosk-info">
                        <span class="name">${h.name}</span>
                        <span class="title">${h.title}</span>
                      </div>
                    </div>
                    
                    <div class="bio-preview">
                        ${h.bio}
                    </div>

                    <div class="card-actions">
                        <button class="talk-btn" @click=${(e: Event) => { e.stopPropagation(); this.selectHero(h); }}>
                            ${this.currentHero.id === h.id ? 'LANJUT DIALOG' : 'MULAILAH DIALOG'}
                        </button>
                        <button class="info-btn" @click=${(e: Event) => this.toggleBio(e, h.id)}>
                            ${this.activeBioHeroId === h.id ? '✕' : 'ⓘ'}
                        </button>
                    </div>
                  </div>
                `)}
              </div>
            </div>

            <!-- Voice Persona -->
            <div class="pop-up-grid-section">
              <div class="section-label">
                Persona Narator (Suara)
              </div>
              <div class="voice-grid">
                ${VOICE_PERSONAS.map(v => html`
                  <div class="voice-kiosk-item ${this.selectedVoice === v.name ? 'active' : ''}" @click=${() => this.selectVoice(v.name)}>
                    ${v.name} • ${v.weight}
                  </div>
                `)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="museum-tag">METRO HISTORY PROJECT • DOKTERSWONING 1935 • KOTA METRO, LAMPUNG</div>

      <gdm-live-audio-visuals-3d
        .inputNode=${this.inputNode}
        .outputNode=${this.outputNode}
        style="opacity: 0.6"></gdm-live-audio-visuals-3d>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gdm-live-audio': GdmLiveAudio;
  }
}
