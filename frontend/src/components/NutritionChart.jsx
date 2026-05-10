import React from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function NutritionChart({ result }) {
  if (!result?.jours) return null;

  // Aggregate macros across all meals
  let totalCal = 0, totalProt = 0, mealCount = 0;
  const dayLabels = [];
  const dayCalories = [];

  result.jours.forEach((j, idx) => {
    let dayCal = 0;
    j.repas?.forEach(r => {
      if (r.calories) { totalCal += Number(r.calories); dayCal += Number(r.calories); }
      if (r.proteines) totalProt += Number(r.proteines);
      mealCount++;
    });
    dayLabels.push(`Jour ${j.jour || idx + 1}`);
    dayCalories.push(dayCal);
  });

  const avgCal = mealCount > 0 ? Math.round(totalCal / result.jours.length) : 0;

  // Macro donut: estimate carbs/fat from calories
  const protCal = totalProt * 4;
  const fatCal = Math.round(totalCal * 0.28);
  const carbCal = Math.max(0, totalCal - protCal - fatCal);

  const donutData = {
    labels: ['Protéines', 'Glucides', 'Lipides'],
    datasets: [{
      data: [Math.round(protCal), Math.round(carbCal), Math.round(fatCal)],
      backgroundColor: ['rgba(14,165,233,0.8)', 'rgba(168,85,247,0.8)', 'rgba(236,72,153,0.8)'],
      borderColor: ['#0ea5e9', '#a855f7', '#ec4899'],
      borderWidth: 2,
    }]
  };

  const barData = {
    labels: dayLabels,
    datasets: [{
      label: 'Calories (kcal)',
      data: dayCalories,
      backgroundColor: 'rgba(14,165,233,0.5)',
      borderColor: '#0ea5e9',
      borderWidth: 2,
      borderRadius: 8,
    }]
  };

  const donutOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 12 } } },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} kcal` } }
    },
    cutout: '65%',
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
    }
  };

  if (totalCal === 0) return null;

  return (
    <div style={{background:'var(--card)', border:'1px solid var(--card-border, var(--g200))', borderRadius:'var(--rad)', padding:24, marginBottom:24}}>
      <h3 style={{fontSize:18, fontWeight:800, marginBottom:20, color:'var(--txt)', letterSpacing:'-0.3px'}}>
        📊 Analyse Nutritionnelle
      </h3>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:24}}>
        <div style={{background:'rgba(14,165,233,0.08)', border:'1px solid rgba(14,165,233,0.2)', borderRadius:12, padding:'14px 16px', textAlign:'center'}}>
          <div style={{fontSize:24, fontWeight:900, color:'#0ea5e9'}}>{Math.round(totalCal).toLocaleString()}</div>
          <div style={{fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginTop:4}}>kcal total</div>
        </div>
        <div style={{background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.2)', borderRadius:12, padding:'14px 16px', textAlign:'center'}}>
          <div style={{fontSize:24, fontWeight:900, color:'#a855f7'}}>{avgCal}</div>
          <div style={{fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginTop:4}}>kcal / jour</div>
        </div>
        <div style={{background:'rgba(236,72,153,0.08)', border:'1px solid rgba(236,72,153,0.2)', borderRadius:12, padding:'14px 16px', textAlign:'center'}}>
          <div style={{fontSize:24, fontWeight:900, color:'#ec4899'}}>{Math.round(totalProt)}g</div>
          <div style={{fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginTop:4}}>Protéines</div>
        </div>
      </div>
      <div style={{display:'grid', gridTemplateColumns: dayCalories.length > 1 ? '1fr 1fr' : '1fr', gap:24}}>
        <div>
          <div style={{fontSize:13, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12}}>Répartition Macro</div>
          <div style={{maxWidth:280, margin:'0 auto'}}>
            <Doughnut data={donutData} options={donutOptions} />
          </div>
        </div>
        {dayCalories.length > 1 && (
          <div>
            <div style={{fontSize:13, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12}}>Calories par Jour</div>
            <Bar data={barData} options={barOptions} />
          </div>
        )}
      </div>
    </div>
  );
}
