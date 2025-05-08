const Subscription = require("../models/Subscription/Subscription");
const Service = require("../models/Subscription/Service");

const getCharts = async (req, res) => {
  try {
    // 1. Obtener suscripciones ACTIVAS por servicio (total)
    const subscriptionsByService = await Subscription.aggregate([
      {
        $match: { status: { $ne: "inactive" } } // Solo suscripciones activas
      },
      {
        $group: {
          _id: "$service",
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "services",
          localField: "_id",
          foreignField: "_id",
          as: "serviceInfo"
        }
      },
      {
        $unwind: "$serviceInfo"
      },
      {
        $project: {
          serviceName: "$serviceInfo.name",
          count: 1
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // 2. Obtener suscripciones ACTIVAS por servicio y tipo
    const subscriptionsByType = await Subscription.aggregate([
      {
        $match: { status: { $ne: "inactive" } } // Solo suscripciones activas
      },
      {
        $group: {
          _id: {
            service: "$service",
            type: "$type"
          },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "services",
          localField: "_id.service",
          foreignField: "_id",
          as: "serviceInfo"
        }
      },
      {
        $unwind: "$serviceInfo"
      },
      {
        $project: {
          serviceName: "$serviceInfo.name",
          type: "$_id.type",
          count: 1
        }
      }
    ]);

    // Procesar datos para el frontend
    const labels = subscriptionsByService.map(item => item.serviceName);
    
    const singleData = labels.map(label => {
      const found = subscriptionsByType.find(item => 
        item.serviceName === label && item.type === "single"
      );
      return found ? found.count : 0;
    });

    const sharedData = labels.map(label => {
      const found = subscriptionsByType.find(item => 
        item.serviceName === label && item.type === "shared"
      );
      return found ? found.count : 0;
    });

    const response = {
      subscriptions: {
        labels: labels,
        datasets: [
          {
            label: "Total Suscripciones",
            data: subscriptionsByService.map(item => item.count),
            borderWidth: 2
          },
          {
            label: "Compartidas",
            data: sharedData,
            borderWidth: 2
          },
          {
            label: "Completas",
            data: singleData,
            borderWidth: 2
          }
        ]
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error("Error al obtener datos para gráficos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener datos para gráficos"
    });
  }
};

module.exports = {
  getCharts
};