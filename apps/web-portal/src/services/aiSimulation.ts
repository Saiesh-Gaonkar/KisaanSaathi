/**
 * aiSimulation.ts — Service to call the CrewAI Multi-Agent Simulation Engine.
 *
 * This service connects the React Web Portal to the FastAPI backend at
 * /simulate, passing the batch_id and Firebase ID token for authentication.
 */

const CREWAI_ENGINE_URL =
  import.meta.env.VITE_CREWAI_ENGINE_URL || 'http://localhost:8000';

export interface SimulateResponse {
  batch_id: string;
  status: string;
  recommendations_count: number;
  message: string;
}

export interface SimulationError {
  detail: string;
  statusCode: number;
}

/**
 * Trigger the CrewAI multi-agent simulation for a batch.
 *
 * @param batchId - The inventory batch ID in PENDING_SIMULATION state.
 * @param idToken - Firebase Auth ID token for the logged-in farmer.
 * @returns The simulation response with status and recommendation count.
 * @throws SimulationError with detail message and HTTP status.
 */
export const runSimulation = async (
  batchId: string,
  idToken: string
): Promise<SimulateResponse> => {
  const response = await fetch(`${CREWAI_ENGINE_URL}/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ batch_id: batchId }),
  });

  if (!response.ok) {
    let detail = 'Simulation request failed.';
    try {
      const errorBody = await response.json();
      detail = errorBody.detail || detail;
    } catch {
      // Response body wasn't JSON
    }
    const error: SimulationError = {
      detail,
      statusCode: response.status,
    };
    throw error;
  }

  return response.json();
};

/**
 * Check if the CrewAI engine is reachable.
 */
export const checkEngineHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${CREWAI_ENGINE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
};
