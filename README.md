# Binary Resonance Lab

Laboratorio web locale per misurare quali configurazioni emergono sulla faccia di un cubo binario quando una o più sorgenti lo eccitano. Ogni pixel proviene da celle simulate o da misure della loro attività. Il progetto usa JavaScript, Node.js, Three.js, Canvas e un Web Worker. L'esperimento si può eseguire anche da terminale.

## Avvio

Richiede Node.js 22.12 o successivo compatibile con Vite e npm.

```sh
npm ci
npm run dev
```

Aprire l'indirizzo locale stampato da Vite. Dopo l'installazione il laboratorio funziona offline. La pagina iniziale calcola una prova su **64³ al tick 112** e la presenta in pausa. Il file [prima-prova.json](examples/prima-prova.json) riproduce la stessa scena. **Reset** riparte dal tick zero con i parametri correnti. **Passo** applica una singola transizione sincrona.

```sh
npm test
npm run build
npm run experiment -- demo
npm run experiment -- replay examples/prima-prova.json
npm run experiment -- replay examples/prima-prova.json 32
npm run experiment -- sweep examples/prima-prova.json examples/scansione.json
```

Il numero facoltativo dopo il file di replay aggiunge passi. Ogni comando sperimentale crea una directory distinta in `results/` con PNG nativo N × N, registro dell'esperimento e misure JSON. Una scansione aggiunge una tabella JSON di confronto. La build web è in `dist/`.

## Preset di risonanza

Selezionare una miniatura per aprire la prova in pausa sulla faccia Z+. **Frequenza comune** accorda insieme le quattro sorgenti. Al rilascio del cursore il worker ripete la prova dallo stato vuoto fino allo stesso tick, con lo stesso seed e la stessa finestra di 40 passi. Con le frecce della tastiera il cursore avanza di 0,001 cicli/passo. Un secondo clic sulla miniatura ripristina la taratura originale. Con **Avvia** si può seguire l'evoluzione oltre il tick di confronto.

| Preset binario | Frequenza iniziale (cicli/passo) | Cubo | Tick | Pixel nodali cambiati a +0,005 cicli/passo |
| --- | ---: | ---: | ---: | ---: |
| Croce diagonale | 0,125 | 64³ | 125 | 0,39% |
| Reticolo di losanghe | 0,050 | 32³ | 62 | 21,88% |
| Quattro corone | 0,125 | 32³ | 89 | 14,06% |
| Rosetta a quattro lobi | 0,190 | 32³ | 128 | 34,38% |

**Riferimento fisico.** Il protocollo PHYWE impiega un generatore sinusoidale e consiglia di variare lentamente la frequenza. A pagina 9, per la loro piastra quadrata, riporta le diagonali a 185 Hz, il reticolo a 1100 Hz, la X con archi a 1550 Hz e quattro anelli a 1960 Hz. Queste frequenze dipendono dall'apparato. Il gruppo di Toronto pubblica fotografie e frequenze misurate su una diversa piastra quadrata di alluminio da 70 cm eccitata al centro. [Scheda PHYWE con le figure](https://fenix.tecnico.ulisboa.pt/downloadFile/3096843219132685/PHYWE_chladni_p2150501_en-1.pdf#page=9) · [Esperimento dell’Università di Toronto](https://www.physics.utoronto.ca/nonlinear/chladni.html)

**Taratura digitale.** Le quattro ricette usano il seno codificato in bit, quattro sorgenti in fase sulla faccia Z− e la regola di conteggio esatto con un vicino attivo. Per la croce, le corone e la rosetta le quattro celle sorgente sono raccolte al centro. Per le losanghe sono distanziate. Frequenza, confini, soglia nodale e istante di osservazione sono stati scelti confrontando prove del motore. Gli Hz sperimentali e i cicli/passo sono scale indipendenti. Le miniature riproducono i pixel misurati al tick indicato. La tabella riporta la distanza di Hamming tra immagini nodali allo stesso tick. La persistenza successiva della figura si può misurare facendo avanzare la prova.

## Primo confronto riproducibile

1. Importare la prima prova. Il generatore è in (32, 32, 0), la faccia osservata è Z+, il vicinato contiene sei celle e la regola attiva una cella quando esattamente un vicino è acceso.
2. Aprire **Scansioni**, selezionare **Conteggio esatto**, impostare le frequenze A a `0.10,0.125,0.15`, lasciare B vuota e usare fase 0 e 112 passi. Ogni riga riparte dal medesimo stato iniziale.
3. Confrontare i risultati e premere **Riproduci** per ispezionare una prova. Cambiare l'osservazione in attività o sabbia, quindi avanzare di un passo alla volta. L'archivio ZIP conserva parametri, immagini e misure delle prove completate.

Risultati misurati con il registro incluso e una finestra di 24 passi sulla faccia Z+ in modalità diretta.

| Frequenza A (cicli/passo) | Celle attive al tick 112 | Cambi per cella e passo nella finestra |
| ---: | ---: | ---: |
| 0,100 | 23,78% | 26,30% |
| 0,125 | 27,15% | 25,77% |
| 0,150 | 21,78% | 25,93% |

In queste tre prove la faccia continua a cambiare. La differenza di densità documenta una sensibilità alla frequenza per questo mezzo, questa regola e questo istante. Per verificare una risonanza serve definire una risposta misurabile e seguirla al variare della frequenza su più finestre, comprese quelle successive allo spegnimento della sorgente.

## Dinamica

- Dimensioni ammesse di 16³, 32³, 64³ e 128³. Lo stato corrente, precedente e successivo usa buffer `Uint8Array` con valori 0 e 1. Il materiale è una maschera distinta. L'indice interno è contiguo lungo X.
- Ogni passo legge unicamente i buffer già completati. Si calcola la regola locale, si iniettano i bit delle sorgenti nella loro regione mediante XOR, poi si scambiano i buffer. La sorgente emessa al tempo 0 è visibile al tick 1. Con il vicinato a sei celle un cambiamento può percorrere al massimo un arco per passo.
- I vicinati 6, 18 e 26 includono rispettivamente facce, facce e spigoli, oppure anche angoli. Il vicinato esclude la cella stessa.
- **XOR + memoria** calcola `parità(vicini al tempo t) XOR stato(t−1)`. Con mezzo statico uniforme, senza forzanti e dissipazione, la coppia di stati consente di invertire il passo. **XOR**, **AND**, **OR**, conteggio esatto e soglia usano il conteggio corrente. **Soglia + memoria** mantiene il bit corrente quando il conteggio coincide con la soglia e usa il confronto stretto negli altri casi.
- I confini periodici collegano facce opposte. Quelli riflettenti replicano il bit al bordo nel vicino esterno. Quelli assorbenti usano zero all'esterno. Sono convenzioni discrete la cui risposta dipende dalla regola scelta.
- Un ostacolo o una cavità bloccano a zero un parallelepipedo. Hanno la stessa dinamica in questa versione. Un vicino interno a una barriera riflettente restituisce il bit della cella che lo interroga. Un assorbitore locale azzera l'uscita a transizioni alterne. Una regione può anche applicare una delle regole locali. In caso di sovrapposizione prevale l'ultima regione.
- Si può partire da vuoto, da una cella centrale o da rumore binario deterministico. **Regione da seed** genera posizioni ripetibili in funzione del seed e del numero di regioni già presenti.

## Generatori e tempo

Ogni sorgente ha posizione, raggio, direzione, frequenza in cicli per passo, fase in gradi, intensità percentuale, durata e interruttore. La direzione seleziona la metà orientata della sfera di emissione. La dinamica successiva segue il vicinato. L'intensità sceglie una frazione ripetibile di celle del supporto. A raggio zero l'intensità determina se l'unica cella partecipa. Le sorgenti sovrapposte combinano le eccitazioni con XOR.

L'onda binaria è attiva per mezzo periodo, la pulsante per un ottavo. La sequenza divide un periodo nei bit indicati. La sorgente casuale usa un hash del seed, dell'indice del generatore e del semiperiodo. Il seno e il triangolo sono codificati in bit con un confronto a quattro livelli. L'impulso singolo agisce alla prima transizione della prova. Durata e fase sono riferite al tempo assoluto dell'esperimento. Durata zero significa continua. Il controllo di velocità in Hz imposta un obiettivo di aggiornamento a schermo e lascia invariato il tempo del modello.

## Osservazione e misure

La faccia Z usa X orizzontale e Y verticale, la faccia X usa Y e Z, la faccia Y usa X e Z. La prima riga dell'immagine corrisponde alla coordinata verticale zero. Le facce opposte conservano l'orientamento degli assi per il confronto pixel per pixel.

| Modalità | Significato dei pixel |
| --- | --- |
| Stato diretto | Nero per 1, bianco per 0 |
| Attività accumulata | Il grigio codifica la frazione di transizioni in cui il pixel cambia nella finestra mobile |
| Nodale | Nero quando la frazione di cambi è minore o uguale alla soglia impostata |
| Sabbia virtuale | Nero per una particella presente sulla superficie |

La finestra comprende i campioni effettivamente disponibili fino alla larghezza configurata. Il primo stato è il riferimento. La sabbia parte da un'occupazione deterministica di circa il 24%. Ogni particella può compiere al massimo un passo verso un vicino ortogonale libero e strettamente meno attivo. Una seconda particella non può occupare la stessa destinazione. La massa si conserva durante il movimento. Cambiare faccia o larghezza della finestra inizializza un nuovo osservatore.

**Densità immagine**, **simmetria** ed **entropia** descrivono l'immagine mostrata. La densità è il nero medio normalizzato, la simmetria misura la somiglianza media con le riflessioni orizzontale e verticale, l'entropia di Shannon usa l'istogramma dei livelli di grigio. **Attività** e **persistenza** descrivono le transizioni binarie sulla faccia. La persistenza è la frazione di celle senza cambi nella finestra. Il grafico mostra fino a 100 valori istantanei della frazione di celle cambiate.

I file di misure contengono le statistiche della faccia binaria e, sotto `image`, quelle dell'immagine scelta. Il flag `persistent` richiede una finestra completa, una faccia non uniforme e zero cambi. Una faccia temporaneamente invariata costituisce una candidata da osservare più a lungo. Una regione nodale può anche essere una zona ancora irraggiunta dal segnale.

La vista 3D permette rotazione, zoom, opacità, visualizzazione delle celle inattive e sezioni X/Y/Z. Il volume grande usa un campione spaziale deterministico di circa 42.000 posizioni per fotogramma. Le sezioni, i pixel della faccia e le misure usano tutte le celle pertinenti. Three.js usa WebGL per la vista e dispone di una proiezione Canvas di riserva.

## Registro e scansioni

Il JSON `binary-resonance-lab/1` include la configurazione iniziale con seed, la sequenza ordinata degli interventi con tick, il tick finale e la modalità di osservazione. Un evento al tick T si applica dopo T transizioni e prima della successiva. Le modifiche strutturali a dimensione, seed o stato iniziale avviano una prova nuova. Il replay ricostruisce anche la finestra e la distribuzione della sabbia. Il costo è proporzionale al numero di passi registrati.

Le scansioni combinano frequenze A, frequenze B facoltative, fasi di A e regole. Si possono usare liste e intervalli nell'interfaccia. Nel [file di specifica](examples/scansione.json) gli assi sono array espliciti. Un valore B nullo conserva l'eventuale seconda sorgente originale. Un valore numerico imposta la seconda sorgente, creandola se necessario. Le altre sorgenti configurate restano attive secondo i propri parametri. Ogni prova usa i parametri correnti come condizioni di partenza al tick zero. Si possono interrompere i lotti nel browser e salvare le prove già completate.

## Architettura e sviluppi di ricerca

| Componente | Responsabilità |
| --- | --- |
| `src/core/grid.js` | Griglia, vicinati, celle fantasma dei confini |
| `src/core/engine.js`, `rule.js`, `oscillator.js` | Transizioni, tavole delle regole, supporti e segnali delle sorgenti |
| `src/core/observer.js`, `analyzer.js` | Superfici, finestra, sabbia e misure |
| `src/core/experiment.js`, `sweep.js` | Registro, replay e prodotto cartesiano delle prove |
| `src/worker.js` | Esecuzione fuori dal thread dell'interfaccia e campionamento della vista |
| `src/ui/`, `cli.js` | Interfaccia locale e ingresso headless sullo stesso motore |

Per gli **oloni**, il passo successivo è definire un criterio operativo di unità persistente. Si può partire da regioni connesse osservate nel volume, misurarne durata e risposta a una perturbazione locale, poi confrontarle con prove di controllo a sorgenti spente e con seed diversi. Occorre distinguere identità nel tempo e semplice immobilità.

Per un **learner**, i registri forniscono esempi ripetibili di ingresso, parametri e uscita. Un primo compito verificabile è scegliere, da una scansione, la configurazione che minimizza la distanza di Hamming da una faccia binaria bersaglio. La verifica dovrebbe usare seed e configurazioni tenuti fuori dalla ricerca. Questa fase e l'eventuale motore comparativo a equazione delle onde sono sviluppi successivi.
