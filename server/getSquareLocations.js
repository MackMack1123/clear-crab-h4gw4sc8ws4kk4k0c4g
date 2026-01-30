const { SquareClient, SquareEnvironment } = require('square');

console.log('SquareEnvironment:', SquareEnvironment);

const client = new SquareClient({
    token: 'EAAAl11zv_MOjSxMdoBVl35cdappIUiK6eamGnuo9So08uysXGYGxHJQqE2E9IyX',
    environment: SquareEnvironment.Production // Using enum 
});

async function getLocations() {
    try {
        const response = await client.locations.list();
        console.log('Locations Response Keys:', Object.keys(response));

        const locations = response.locations || response.result?.locations;

        if (locations) {
            console.log('Locations:');
            locations.forEach(location => {
                console.log(`- Name: ${location.name}, ID: ${location.id}, Status: ${location.status}`);
            });
        }
    } catch (error) {
        console.error('Error fetching locations:', error);
    }
}

getLocations();
