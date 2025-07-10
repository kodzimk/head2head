import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import aiohttp
from pydantic import BaseModel, Field


logger = logging.getLogger(__name__)


class Transfer(BaseModel):
    """Transfer data model"""
    player_name: str
    player_id: int
    from_team: str
    to_team: str
    transfer_date: str
    transfer_type: str
    fee: Optional[str] = None
    fee_value: Optional[int] = None
    currency: Optional[str] = None


class TransferService:
    """Service for managing football transfers from API-Football (direct API access)"""
    
    def __init__(self):
        self.api_key = "dae4d26666e463a7681ae93282a83eb7"
        self.base_url = "https://v3.football.api-sports.io"
        self.headers = {
            "x-apisports-key": self.api_key
        }
        
        # Major leagues and their IDs
        self.leagues = {
            "Premier League": 39,      # England
            "La Liga": 140,           # Spain
            "Bundesliga": 78,         # Germany
            "Serie A": 135,           # Italy
            "Ligue 1": 61,           # France
            "Eredivisie": 88,        # Netherlands
            "Primeira Liga": 94,     # Portugal
        }
        
        # Major teams and their IDs
        self.teams = {
            "Manchester United": 33,
            "Manchester City": 50,
            "Liverpool": 40,
            "Chelsea": 49,
            "Real Madrid": 541,
            "Barcelona": 529,
            "Bayern Munich": 157,
            "PSG": 85,
            "Juventus": 496,
            "AC Milan": 489,
            "Inter Milan": 505,
            "Ajax": 194,
            "Porto": 212
        }
        
        # In-memory storage
        self.transfers_data: List[Transfer] = []
        self.last_fetch_time: Optional[datetime] = None
        self.fetch_interval = timedelta(minutes=15)
        self.is_fetching = False
        
        # Background task
        self._background_task: Optional[asyncio.Task] = None
    
    async def fetch_transfers_from_api(self) -> List[Transfer]:
        """Fetch latest transfers from API-Football"""
        try:
            logger.info("Fetching transfers from API-Football (direct)...")
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/transfers"
                all_transfers = []
                
                # Get current date and date 30 days ago
                end_date = datetime.now().strftime("%Y-%m-%d")
                start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
                
                # Try different parameter combinations
                param_combinations = [
                    {"season": "2024"},  # Current season
                    {"date": end_date},  # Today's date
                    {"date": start_date},  # 30 days ago
                ]
                
                # Add league-based parameters
                for league_id in self.leagues.values():
                    param_combinations.append({"league": str(league_id)})
                
                # Add team-based parameters
                for team_id in self.teams.values():
                    param_combinations.append({"team": str(team_id)})
                
                for i, params in enumerate(param_combinations):
                    logger.info(f"Attempt {i+1}: Making API request to: {url} with params: {params}")
                    
                    try:
                        async with session.get(url, headers=self.headers, params=params) as response:
                            if response.status == 200:
                                data = await response.json()
                                transfers = self._parse_transfer_data(data)
                                logger.info(f"Attempt {i+1}: Successfully parsed {len(transfers)} transfers")
                                
                                # Add unique transfers to our list
                                for transfer in transfers:
                                    if not any(t.player_id == transfer.player_id and 
                                             t.transfer_date == transfer.transfer_date for t in all_transfers):
                                        all_transfers.append(transfer)
                                
                                # If we have enough transfers, we can stop
                                if len(all_transfers) >= 50:
                                    logger.info("Reached maximum number of transfers (50)")
                                    break
                                    
                            elif response.status == 429:
                                logger.warning("API rate limit exceeded")
                                await asyncio.sleep(60)  # Wait a minute before next attempt
                                continue
                            else:
                                logger.error(f"API request failed with status {response.status}")
                                response_text = await response.text()
                                logger.error(f"Response: {response_text}")
                                continue
                                
                    except Exception as e:
                        logger.error(f"Error in attempt {i+1}: {e}")
                        continue
                
                logger.info(f"Total unique transfers collected: {len(all_transfers)}")
                return all_transfers[:50]  # Return at most 50 transfers
                        
        except aiohttp.ClientError as e:
            logger.error(f"Network error while fetching transfers: {e}")
            raise Exception(f"Network error: {e}")
        except Exception as e:
            logger.error(f"Error fetching transfers: {e}")
            raise
    
    def _parse_transfer_data(self, api_data: Dict[str, Any]) -> List[Transfer]:
        """Parse API response data into Transfer objects"""
        transfers = []
        
        try:
            logger.info(f"Parsing API data with keys: {list(api_data.keys()) if isinstance(api_data, dict) else 'not a dict'}")
            
            if "response" in api_data and isinstance(api_data["response"], list):
                logger.info(f"Found response array with {len(api_data['response'])} items")
                
                for i, transfer_data in enumerate(api_data["response"]):
                    if not isinstance(transfer_data, dict):
                        logger.warning(f"Response item {i} is not a dict: {type(transfer_data)}")
                        continue
                    
                    logger.info(f"Processing response item {i} with keys: {list(transfer_data.keys())}")
                    
                    # Extract player information
                    player = transfer_data.get("player", {})
                    transfers_list = transfer_data.get("transfers", [])
                    
                    logger.info(f"Player data: {player}")
                    logger.info(f"Transfers list length: {len(transfers_list) if isinstance(transfers_list, list) else 'not a list'}")
                    
                    if not transfers_list:
                        logger.info(f"No transfers found for player {player.get('name', 'Unknown')}")
                        continue
                    
                    # Get the most recent transfer for this player
                    for j, transfer in enumerate(transfers_list[:10]):  # Limit to recent transfers
                        try:
                            logger.info(f"Processing transfer {j} for player {player.get('name', 'Unknown')}: {transfer}")
                            
                            teams = transfer.get("teams", {})
                            from_team = teams.get("out", {}).get("name", "Unknown") if teams.get("out") else "Unknown"
                            to_team = teams.get("in", {}).get("name", "Unknown") if teams.get("in") else "Unknown"
                            
                            transfer_obj = Transfer(
                                player_name=player.get("name", "Unknown Player"),
                                player_id=player.get("id", 0),
                                from_team=from_team,
                                to_team=to_team,
                                transfer_date=transfer.get("date", ""),
                                transfer_type=transfer.get("type", ""),
                                fee=transfer.get("fee", None),
                                fee_value=None,  # API-Football doesn't provide numerical fee values
                                currency=None
                            )
                            transfers.append(transfer_obj)
                            logger.info(f"Successfully created transfer object: {transfer_obj}")
                            
                            # Stop after getting at least 10 transfers
                            if len(transfers) >= 10:
                                break
                                
                        except Exception as e:
                            logger.warning(f"Error parsing individual transfer {j}: {e}")
                            continue
                    
                    if len(transfers) >= 10:
                        break
            else:
                logger.warning("No 'response' key found in API data or response is not a list")
                        
        except Exception as e:
            logger.error(f"Error parsing transfer data: {e}")
        
        logger.info(f"Final parsed transfers count: {len(transfers)}")
        return transfers[:10]  # Ensure we return at most 10 transfers
    
    async def update_transfers_data(self) -> bool:
        """Update in-memory transfers data"""
        if self.is_fetching:
            logger.info("Transfer fetch already in progress, skipping...")
            return False
        
        try:
            self.is_fetching = True
            new_transfers = await self.fetch_transfers_from_api()
            
            if new_transfers:
                self.transfers_data = new_transfers
                self.last_fetch_time = datetime.now()
                logger.info(f"Updated transfers data with {len(new_transfers)} transfers")
                return True
            else:
                logger.warning("No transfers data received from API")
                return False
                
        except Exception as e:
            logger.error(f"Failed to update transfers data: {e}")
            return False
        finally:
            self.is_fetching = False
    
    async def get_transfers(self) -> List[Transfer]:
        """Get current transfers data, fetch if not available or stale"""
        current_time = datetime.now()
        
        # Check if data needs to be fetched
        should_fetch = (
            not self.transfers_data or  # No data available
            not self.last_fetch_time or  # Never fetched
            current_time - self.last_fetch_time > self.fetch_interval  # Data is stale
        )
        
        if should_fetch and not self.is_fetching:
            logger.info("Transfers data is stale or missing, fetching fresh data...")
            await self.update_transfers_data()
        
        return self.transfers_data
    
    async def start_background_refresh(self):
        """Start background task to refresh transfers data every 15 minutes"""
        if self._background_task and not self._background_task.done():
            logger.info("Background refresh task already running")
            return
        
        logger.info("Starting transfers background refresh task...")
        self._background_task = asyncio.create_task(self._background_refresh_loop())
    
    async def _background_refresh_loop(self):
        """Background loop to refresh transfers data"""
        while True:
            try:
                await asyncio.sleep(self.fetch_interval.total_seconds())
                logger.info("Background refresh: Updating transfers data...")
                await self.update_transfers_data()
            except asyncio.CancelledError:
                logger.info("Background refresh task cancelled")
                break
            except Exception as e:
                logger.error(f"Error in background refresh: {e}")
                # Continue the loop even if there's an error
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
    def stop_background_refresh(self):
        """Stop background refresh task"""
        if self._background_task and not self._background_task.done():
            self._background_task.cancel()
            logger.info("Background refresh task stopped")
    
    def get_status(self) -> Dict[str, Any]:
        """Get service status information"""
        return {
            "data_count": len(self.transfers_data),
            "last_fetch_time": self.last_fetch_time.isoformat() if self.last_fetch_time else None,
            "is_fetching": self.is_fetching,
            "next_fetch_in_minutes": (
                (self.fetch_interval - (datetime.now() - self.last_fetch_time)).total_seconds() / 60
                if self.last_fetch_time else 0
            ),
            "background_task_running": (
                self._background_task and not self._background_task.done()
                if self._background_task else False
            )
        }


# Global instance
transfer_service = TransferService() 