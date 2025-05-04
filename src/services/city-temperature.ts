/**
 * Represents temperature data for a city.
 */
export interface CityTemperature {
  /**
   * The name of the city.
   */
  city: string;
  /**
   * The temperature in Celsius.
   */
  temperature: number;
}

/**
 * Asynchronously retrieves temperature data for a given city.
 *
 * @param city The name of the city to retrieve temperature data for.
 * @returns A promise that resolves to a CityTemperature object containing the city name and temperature.
 */
export async function getCityTemperature(city: string): Promise<CityTemperature> {
  // TODO: Implement this by calling an external weather API.

  return {
    city: city,
    temperature: 22.0,
  };
}
