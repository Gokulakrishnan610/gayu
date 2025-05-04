/**
 * Represents sensor data containing temperature and humidity.
 */
export interface SensorData {
  /**
   * The temperature in Celsius.
   */
  temperature: number;
  /**
   * The humidity percentage.
   */
  humidity: number;
}

/**
 * Asynchronously retrieves sensor data.
 *
 * @returns A promise that resolves to a SensorData object containing temperature and humidity.
 */
export async function getSensorData(): Promise<SensorData> {
  // TODO: Implement this by calling the ESP32 API.
  // The ESP32 API returns data like this:
  // {"temperature":25.5,"humidity":60.2}

  return {
    temperature: 25.5,
    humidity: 60.2,
  };
}

/**
 * Represents the status of the sensor.
 */
export interface SensorStatus {
  /**
   * The status message.
   */
  status: string;
  /**
   * The IP address of the sensor.
   */
  ip: string;
}

/**
 * Asynchronously retrieves sensor status.
 *
 * @returns A promise that resolves to a SensorStatus object containing status and IP address.
 */
export async function getSensorStatus(): Promise<SensorStatus> {
  // TODO: Implement this by calling the ESP32 API.
  // The ESP32 API returns data like this:
  // {"status":"OK", "ip":"192.168.4.1"}
  return {
    status: 'OK',
    ip: '192.168.4.1',
  };
}
