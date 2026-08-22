import { SampleNote } from '../types';

export const SAMPLE_NOTES: SampleNote[] = [
  {
    id: 'neuroscience',
    title: 'Neuroscience: Action Potentials & Synaptic Transmission',
    subject: 'Biology / Neuroscience',
    tags: ['Biology', 'Exam Prep', 'Neuroscience'],
    iconName: 'Brain',
    description: 'Electrical signaling in neurons, resting membrane potential, ion channels, action potential stages, and neurotransmitters.',
    content: `LECTURE NOTES: NEUROSCIENCE 201 - NEURAL COMMUNICATION

1. RESTING MEMBRANE POTENTIAL & IONIC GRADIENTS
- A resting neuron maintains an electrical membrane potential of approximately -70 mV (inside negative relative to extracellular fluid).
- Maintained primarily by the Sodium-Potassium Pump (Na+/K+ ATPase), which actively transports 3 Na+ ions OUT of the cell for every 2 K+ ions brought IN.
- Intracellular concentration: High Potassium (K+), Low Sodium (Na+), high negatively charged proteins (A-).
- Extracellular concentration: High Sodium (Na+), High Chloride (Cl-), Low Potassium (K+).

2. STAGES OF AN ACTION POTENTIAL
Action potentials are rapid, all-or-none electrical signals propagated down an axon.
- Threshold Potential: Neuronal membrane must depolarize to approximately -55 mV to trigger an action potential.
- Depolarization: Voltage-gated Na+ channels open rapidly, allowing Na+ influx down its electrochemical gradient, causing membrane potential to spike up to +30 mV.
- Repolarization: Voltage-gated Na+ channels inactivation gates close. Voltage-gated K+ channels open, causing K+ efflux out of the cell, restoring negative intracellular charge.
- Hyperpolarization (Undershoot): K+ channels close slowly, causing potential to briefly drop below resting state (~ -80 mV) before returning to -70 mV via leaky channels and Na+/K+ pump.
- Absolute Refractory Period: No new action potential can be fired because Na+ channels are inactivated.
- Relative Refractory Period: A stronger-than-normal stimulus can trigger an action potential because membrane is hyperpolarized.

3. MYELINATION & SALTATORY CONDUCTION
- Myelin Sheaths are formed by Schwann Cells in the Peripheral Nervous System (PNS) and Oligodendrocytes in the Central Nervous System (CNS).
- Nodes of Ranvier: Unmyelinated gaps where voltage-gated channels are concentrated.
- Saltatory Conduction: Action potentials "jump" from node to node, drastically increasing conduction velocity from 1 m/s to over 100 m/s while conserving energy.

4. SYNAPTIC TRANSMISSION
- Chemical Synapses: Electrical signal converted to chemical signal at axon terminal.
- Voltage-gated Ca2+ channels open when action potential arrives at terminal -> Ca2+ influx.
- Ca2+ influx causes synaptic vesicles containing neurotransmitters (e.g., Acetylcholine, Glutamate, GABA) to undergo exocytosis into the synaptic cleft.
- Postsynaptic Receptors: Neurotransmitters bind to ligand-gated ion channels.
  * EPSP (Excitatory Postsynaptic Potential): Na+ influx causes depolarization (e.g., Glutamate).
  * IPSP (Inhibitory Postsynaptic Potential): Cl- influx or K+ efflux causes hyperpolarization (e.g., GABA).
- Inactivation: Neurotransmitters cleared via reuptake pumps, enzymatic degradation (e.g., Acetylcholinesterase), or glial absorption.`
  },
  {
    id: 'machine-learning',
    title: 'Machine Learning: Supervised Learning & Optimization',
    subject: 'Computer Science',
    tags: ['Computer Science', 'Exam Prep', 'AI'],
    iconName: 'Cpu',
    description: 'Gradient descent, loss functions, bias-variance tradeoff, regularization, and evaluation metrics.',
    content: `LECTURE NOTES: CS 480 - FUNDAMENTALS OF MACHINE LEARNING

1. SUPERVISED VS UNSUPERVISED LEARNING
- Supervised Learning: Training model on paired feature-label datasets (X, y) to predict labels for unseen input data. Examples: Classification (discrete targets) and Regression (continuous targets).
- Unsupervised Learning: Discovering underlying structure, clusters, or patterns in unlabeled data X. Examples: K-Means Clustering, PCA (Principal Component Analysis).

2. GRADIENT DESCENT & OPTIMIZATION
- Loss Function: Quantifies discrepancy between model predictions y_hat and ground truth y.
  * Mean Squared Error (MSE): Used for regression L = (1/N) * sum((y_i - y_hat_i)^2).
  * Binary Cross-Entropy (BCE): Used for binary classification.
- Gradient Descent Update Rule: θ = θ - α * ∇_θ L(θ), where α is the Learning Rate.
- Learning Rate Considerations:
  * Too large α: Overshoots minimum, causes divergence.
  * Too small α: Extremely slow convergence, risks getting stuck in local minima or saddle points.
- Variants: Batch Gradient Descent (entire dataset), Stochastic Gradient Descent / SGD (single sample), Mini-Batch GD (balanced compromise).

3. BIAS-VARIANCE TRADEOFF & OVERFITTING
- Underfitting (High Bias): Model is too simple to capture underlying trend. High error on both training and validation sets.
- Overfitting (High Variance): Model memorizes noise and training specifics. Low training error but high validation error.
- Generalization Error = Bias^2 + Variance + Irreducible Noise.

4. REGULARIZATION TECHNIQUES
- L1 Regularization (Lasso): Adds penalty equal to absolute value of weights α * ||w||_1. Drives non-essential weights strictly to zero, performing automatic feature selection.
- L2 Regularization (Ridge): Adds penalty proportional to squared magnitude of weights α * ||w||_2^2. Shrinks weights smoothly toward zero without eliminating features entirely.
- Dropout: Randomly deactivates a fraction p of neurons during each training step in deep neural networks to prevent co-adaptation.

5. EVALUATION METRICS FOR CLASSIFICATION
- Confusion Matrix: True Positives (TP), False Positives (FP), True Negatives (TN), False Negatives (FN).
- Precision = TP / (TP + FP) [Focus on minimizing false alarms]
- Recall (Sensitivity) = TP / (TP + FN) [Focus on missing true instances]
- F1-Score = 2 * (Precision * Recall) / (Precision + Recall) [Harmonic mean balancing precision and recall]
- ROC-AUC: Receiver Operating Characteristic curve plotting True Positive Rate vs False Positive Rate across classification thresholds.`
  },
  {
    id: 'macroeconomics',
    title: 'Macroeconomics: Monetary & Fiscal Policy',
    subject: 'Economics',
    tags: ['Economics', 'Exam Prep', 'Finance'],
    iconName: 'TrendingUp',
    description: 'Central banks, interest rates, inflation, reserve requirements, expansionary vs contractionary policy.',
    content: `LECTURE NOTES: ECON 102 - MACROECONOMIC POLICY & INFLATION

1. FISCAL POLICY & GOVERNMENT BUDGETS
- Fiscal Policy: Implemented by the government legislature/treasury through changes in Taxation (T) and Government Spending (G).
- Expansionary Fiscal Policy: Applied during recessions. Increases G or decreases T to stimulate aggregate demand (AD). Risks increasing national debt and causing inflation.
- Contractionary Fiscal Policy: Applied during economic overheating/high inflation. Decreases G or increases T to cool aggregate demand.
- The Spending Multiplier = 1 / (1 - MPC), where MPC is Marginal Propensity to Consume. Example: If MPC = 0.8, Multiplier = 5. A $10B increase in government spending increases equilibrium GDP by $50B.

2. MONETARY POLICY & CENTRAL BANK TOOLS
- Monetary Policy: Managed by central banks (e.g., Federal Reserve) controlling money supply (M) and interest rates.
- Primary Tools of Monetary Policy:
  * Open Market Operations (OMOs): Buying government bonds injects liquidity into banking system (Expansionary); Selling bonds absorbs cash (Contractionary).
  * Discount Rate: Interest rate charged to commercial banks for short-term loans directly from central bank. Lowering discount rate encourages borrowing.
  * Reserve Requirements: Percentage of deposits banks must keep on reserve. Lowering ratio increases money creation multiplier.
  * Interest on Reserve Balances (IORB): Policy interest rate paid to commercial banks for keeping excess reserves at the central bank.

3. INFLATION & THE PHILLIPS CURVE
- Demand-Pull Inflation: Occurs when Aggregate Demand exceeds Aggregate Supply ("too much money chasing too few goods").
- Cost-Push Inflation: Caused by negative supply shocks (e.g., sudden oil price hikes) shifting Short-Run Aggregate Supply (SRAS) inward, leading to Stagflation (high inflation + stagnant growth + high unemployment).
- Short-Run Phillips Curve: Depicts inverse relationship between inflation rate and unemployment rate.
- Long-Run Phillips Curve: Vertical line at the Natural Rate of Unemployment (NAIRU), indicating no permanent tradeoff between inflation and unemployment in the long run.`
  },
  {
    id: 'physics-comparison',
    title: 'Document Comparison: Classical Mechanics vs Quantum Physics',
    subject: 'Physics / Comparative Analysis',
    tags: ['Physics', 'Comparative Analysis', 'Exam Prep'],
    iconName: 'GitCompare',
    description: 'Side-by-side analysis of Newtonian Determinism vs Quantum Probabilism, wave-particle duality, and measurement limits.',
    content: `DOCUMENT A: NEWTONIAN & CLASSICAL MECHANICS (Source: Classical_Physics_Vol1.pdf)
1. Determinism & Trajectory: If the exact position (x) and momentum (p) of every particle in a system are known at time t_0, their entire future trajectory can be calculated with 100% mathematical certainty using Newton's Second Law F = dp/dt = m*a.
2. Continuity of Energy: Energy exchange, radiation, and motion occur along smooth, continuous gradients. Any arbitrary energy level E is physically permissible.
3. Measurement Invariance: Physical observables (velocity, position, mass) exist independently of whether they are being observed or measured. The act of measuring a particle does not fundamentally alter its intrinsic physical state.
4. Locality & Causality: All physical interactions propagate locally through direct contact or continuous fields capped strictly by the speed of light c. No instantaneous non-local action at a distance is permitted.

DOCUMENT B: MODERN QUANTUM MECHANICS (Source: Modern_Quantum_Theory_Vol2.pdf)
1. Probabilistic Wavefunctions: Systems are completely described by a complex state wavefunction Ψ(x, t) obeying the Schrödinger Equation iℏ ∂Ψ/∂t = ĤΨ. The exact future trajectory cannot be determined; only probability densities |Ψ|^2 can be computed.
2. Quantization of Energy: Bound physical systems (e.g., electrons in atoms) can only occupy discrete, quantized energy eigenstates E_n = n*h*ν. Radiation is emitted/absorbed in discrete packets called quanta (photons).
3. Heisenberg Uncertainty & Measurement Collapse: It is physically impossible to simultaneously measure position and momentum with arbitrary precision: Δx * Δp ≥ ℏ/2. The physical act of observation collapses the wavefunction superposition into a single discrete eigenvalue.
4. Quantum Entanglement & Non-Locality: Entangled quantum states exhibit instantaneous correlations across arbitrary spatial distances (spooky action at a distance / Bell's theorem violations), proving that local realism is incomplete.`
  }
];
