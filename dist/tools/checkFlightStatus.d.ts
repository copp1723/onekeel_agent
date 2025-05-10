interface CheckFlightStatusArgs {
    flightNumber: string;
    date?: string;
}
/**
 * Creates a checkFlightStatus tool to get flight information
 * @returns A tool object that can be registered with Eko
 */
export declare function checkFlightStatus(): {
    name: string;
    description: string;
    schema: {
        type: string;
        function: {
            name: string;
            description: string;
            parameters: {
                type: string;
                properties: {
                    flightNumber: {
                        type: string;
                        description: string;
                    };
                    date: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
        };
    };
    handler: (args: CheckFlightStatusArgs) => Promise<{
        flightNumber: string;
        date: string;
        status: string;
        departureAirport: string;
        arrivalAirport: string;
        departureTime: string;
        arrivalTime: string;
        terminal: string;
        gate: string;
    }>;
};
export {};
