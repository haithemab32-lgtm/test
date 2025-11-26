
import React from "react";
import { Match } from "./type";

interface MatchScoreProps {
  match: Match;
}

const MatchScore: React.FC<MatchScoreProps> = ({ match }) => (
  <div className="flex flex-col sm:flex-row justify-between text-white text-sm mb-4 gap-2">
    <div className="flex flex-col min-w-0">
      <div className="flex justify-between items-center w-full">
        <span className="truncate">{match.homeTeam.name}</span>
        <strong className="text-yellow-400 ml-2">{match.homeTeam.score}</strong>
      </div>
      <div className="flex justify-between items-center w-full mt-1">
        <span className="truncate">{match.awayTeam.name}</span>
        <strong className="text-yellow-400 ml-2">{match.awayTeam.score}</strong>
      </div>
    </div>
  </div>
);

export default MatchScore;
