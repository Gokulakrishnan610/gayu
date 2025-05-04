/**
 * Represents sensor data containing temperature and humidity.
 */
export interface SensorData {
  /**
   * The temperature in Celsius. Can be null if reading failed.
   */
  temperature: number | null;
  /**
   * The humidity percentage. Can be null if reading failed.
   */
  humidity: number | null;
}

/**
 * Asynchronously retrieves mock sensor data.
 * This function is used as a fallback when the real sensor is unavailable.
 *
 * @returns A promise that resolves to a SensorData object containing mock temperature and humidity.
 */
export async function getSensorData(): Promise<SensorData> {
  // Simulate potential network delay or sensor read time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 300));

  // Simulate occasional read errors for mock data
  if (Math.random() < 0.05) { // 5% chance of error
      console.warn("Mock Sensor: Simulating read error.");
      return {
          temperature: null, // Indicate error with null
          humidity: null,
      };
  }


  // Generate somewhat realistic fluctuating mock data
  const baseTemp = 22;
  const tempFluctuation = (Math.random() - 0.5) * 5; // +/- 2.5 degrees
  const baseHumidity = 55;
  const humidityFluctuation = (Math.random() - 0.5) * 10; // +/- 5%

  return {
    temperature: parseFloat((baseTemp + tempFluctuation).toFixed(1)),
    humidity: parseFloat((baseHumidity + humidityFluctuation).toFixed(1)),
  };
}

/**
 * Represents the status of the sensor.
 */
export interface SensorStatus {
  /**
   * The status message (e.g., "OK", "Error", "Initializing").
   */
  status: string;
  /**
   * The IP address of the sensor, or "N/A (Mock)" if using mock data.
   */
  ip: string;
}

/**
 * Asynchronously retrieves mock sensor status.
 * This function is used as a fallback when the real sensor is unavailable.
 *
 * @returns A promise that resolves to a SensorStatus object containing mock status and IP.
 */
export async function getSensorStatus(): Promise<SensorStatus> {
   // Simulate potential network delay
   await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    // Simulate occasional status issues for mock data
   if (Math.random() < 0.02) { // 2% chance of non-OK status
        console.warn("Mock Sensor: Simulating non-OK status.");
       return {
           status: 'Sensor Offline (Mock)', // Example non-OK status
           ip: 'N/A (Mock)',
       };
   }

  return {
    status: 'OK',
    ip: 'N/A (Mock)', // Clearly indicate this is mock data
  };
}

// Note: The functions to fetch *real* data from an IP are now implemented
// directly within the src/app/page.tsx component using the Fetch API,
// as they depend on the IP address stored in localStorage, which is
// only accessible client-side.
