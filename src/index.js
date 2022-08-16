const colorLegend = (selection, props) => { //crear la leyenda de colores
    const {
        colorScale,
        spacing,
        textOffset
    } = props;

    const groups = selection.selectAll('g')
        .data([50,55,60,65,70,75,80,85,90,95]);
    const groupsEnter = groups
        .enter().append('g')
    groupsEnter
        .merge(groups)
        .attr('transform', (d, i) =>
            `translate(0, ${i * spacing})`
        );
    groups.exit().remove();

    groupsEnter.append('circle')
        .merge(groups.select('circle'))
        .attr('r', 15)
        .attr('class','circleColorLeyend')
        .attr('fill',colorScale);

    groupsEnter.append('text')
        .merge(groups.select('text'))
        .text(d => d + '%')
        .attr('dy', '0.32em')
        .attr('x', textOffset);
}
function sizeLegend (selection, props) { //crear la leyenda de colores
    const {
        sizeScale,
        textOffset,
    } = props;

    const groups = selection.selectAll('g').data([1000,10000,50000,100000]);
    const groupsEnter = groups
        .enter().append('g')
    groupsEnter
        .merge(groups)
    groups.exit().remove();

    groupsEnter.append('circle')
        .merge(groups.select('circle'))
        .attr('r', sizeScale)
        .attr('class','circleLeyend');

    groupsEnter.append('text')
        .merge(groups.select('text'))
        .text(d => d)
        .attr('class','textLeyend')
        .attr('y', d => sizeScale(d)+13)
        .attr('x', -textOffset);
}

const svg = d3.select('svg');
const projection = d3.geoMercator().center([-7,41.5]); //centrar el mapa
projection.scale(3000); //cambiar la escala del mapa
const pathGenerator = d3.geoPath().projection(projection);

//cargar el mapa con las siluetas de los paises en topoJSON y el csv con datos covid
Promise.all([d3.json('https://unpkg.com/es-atlas@0.5.0/es/municipalities.json'),d3.csv('data.csv')])
    .then(([topoJSONdata,csvData]) => {
        //convertir datos Covid en array de objetos
        csvData.forEach(d=> {
            d.porcentaje = +d.porcentaje * 100; //multiplicamos el porcentaje por 100
            d.casos = +d.casos;
        });

        const provinces = topojson.feature(topoJSONdata, topoJSONdata.objects.provinces);

        //CREAR GRUPOS
        g_prov =svg.append('g'); //grupo para las provincias
        g_cir = svg.append('g'); //grupo para los circulos

        //DIBUJAR PROVINCIAS
        g_prov.selectAll('path').data(provinces.features).enter()
            .append('path')
            .attr('class', 'province')
            .attr('d', pathGenerator)

        //CREAR ESCALAS
        const sizeScale = d3.scaleSqrt() //escala que convierte los datos a una escala más pequeña para representarlos
            .domain([0,d3.max(csvData,d => d.casos)]) //intervalo de datos reales
            .range([0,90]); //intervalo que vemos por pantalla

        var colorScale = d3.scaleSequential(d3.interpolateSpectral) //creamos la escala de color a partir de los datos
            .domain([44.9,d3.max(csvData,d => d.porcentaje)]);

        actualizar(csvData);

        //manejador de eventos
        d3.select("#ctrl_mes").on("change", function(evt) { actualizar(csvData); });

        //Funcion que mira el valor del mes seleccionado, filtra los datos y llama a la función que dibuja los circulos
        function actualizar(csvData) {
            // Obtener valores de la interfaz
            var mes = +d3.select("#ctrl_mes").node().value;
            // Filtrado
            const datosMes = csvData.filter(d=> d.mes == mes);
            const rowById = {};
            datosMes.forEach(d=> {
                rowById[d.id] = d;
            });

            const provinces = topojson.feature(topoJSONdata, topoJSONdata.objects.provinces);
            //hacer que se pueda acceder a la información del csv mediante el nombre de provincia del fichero TOPOjson
            provinces.features.forEach(d=> {
                Object.assign(d.properties, rowById[d.id])
            });
            dibujar(provinces);
        }

        //Función que dibuja los circulos sobre las provincias
        function dibujar(provinces){
            const texto = d => d.properties.provincia + '\nCasos: '+ (d.properties.casos) + '\nPorcentaje: '+ d.properties.porcentaje.toFixed(2) + '%';
            g_cir.selectAll('circle').remove();
            g_cir.selectAll('circle').data(provinces.features) //crear un circulo por cada provincia
                .enter().append('circle')
                .attr('class','circles')
                .attr('cx', d => projection(d3.geoCentroid(d))[0]) //poner circulos en el centro de cada pais
                .attr('cy', d => projection(d3.geoCentroid(d))[1])
                .attr('r',d => sizeScale(d.properties.casos)) //le ponemos el ancho de la población que tenga en Linear Scale
                .attr('fill',d=> colorScale(d.properties.porcentaje))
                .append('title').text(texto) //añadir cuadro de texto que muestra info de cada provincia

            g_prov.selectAll('path')
                .append('title').text(texto); //añadir el texto tambien sobre las provincias
        }

        svg.append('g') //añadir la leyenda de tamaños
            .attr('transform', `translate(240,580)`) //colocar en la posicion
            .call(sizeLegend, {
                sizeScale,
                spacing: 80,
                textOffset: 15,
                numTicks: 5,
            })
            .append('text')
            .text('Casos')
            .attr('x', -17)
            .attr('y', -85);

        svg.append('g') //añadir la leyenda de colores
            .attr('transform', `translate(60,290)`)
            .call(colorLegend, {
                colorScale,
                spacing: 40,
                textOffset:20
            })
            .append('text')
            .text('Porcenataje')
            .attr('x', -15)
            .attr('y', -30);
    });