from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
import logging

from .service import transfer_service, Transfer

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/transfers", response_model=List[Transfer])
async def get_transfers():
    """
    Get the latest football transfers.
    
    Returns:
        List of recent football transfers (at least 10 if available)
    
    Raises:
        HTTPException: If there's an error fetching transfer data
    """
    try:
        transfers = await transfer_service.get_transfers()
        
        if not transfers:
            # If no data is available, try to fetch immediately
            logger.info("No transfer data available, attempting immediate fetch...")
            success = await transfer_service.update_transfers_data()
            
            if success:
                transfers = transfer_service.transfers_data
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Unable to fetch transfer data at the moment. Please try again later."
                )
        
        return transfers
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_transfers endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while fetching transfers"
        )


@router.get("/transfers/status")
async def get_transfers_status():
    """
    Get the status of the transfer service.
    
    Returns:
        Dict containing service status information
    """
    try:
        status_info = transfer_service.get_status()
        return {
            "status": "ok",
            "service": "transfer_service",
            **status_info
        }
    except Exception as e:
        logger.error(f"Error getting transfer service status: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "message": "Error getting service status",
                "error": str(e)
            }
        )


@router.post("/transfers/refresh")
async def refresh_transfers():
    """
    Manually trigger a refresh of transfer data.
    
    Returns:
        Success status and updated transfer count
    
    Raises:
        HTTPException: If refresh fails
    """
    try:
        if transfer_service.is_fetching:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Transfer refresh already in progress. Please wait."
            )
        
        success = await transfer_service.update_transfers_data()
        
        if success:
            return {
                "status": "success",
                "message": "Transfers data refreshed successfully",
                "transfer_count": len(transfer_service.transfers_data),
                "last_fetch_time": transfer_service.last_fetch_time.isoformat()
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to refresh transfer data. API may be unavailable."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in refresh_transfers endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while refreshing transfers"
        )


@router.get("/transfers/health")
async def transfers_health_check():
    """
    Health check endpoint for the transfer service.
    
    Returns:
        Health status and basic service information
    """
    try:
        status_info = transfer_service.get_status()
        
        # Determine health status
        is_healthy = True
        health_issues = []
        
        # Check if data is too old (more than 1 hour)
        if status_info["last_fetch_time"]:
            from datetime import datetime, timedelta
            last_fetch = datetime.fromisoformat(status_info["last_fetch_time"])
            if datetime.now() - last_fetch > timedelta(hours=1):
                health_issues.append("Data is stale (older than 1 hour)")
                is_healthy = False
        else:
            health_issues.append("No data has been fetched yet")
            is_healthy = False
        
        # Check if background task is running
        if not status_info["background_task_running"]:
            health_issues.append("Background refresh task not running")
            is_healthy = False
        
        return {
            "status": "healthy" if is_healthy else "degraded",
            "service": "transfer_service",
            "issues": health_issues,
            "data_available": status_info["data_count"] > 0,
            **status_info
        }
        
    except Exception as e:
        logger.error(f"Error in transfers health check: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "unhealthy",
                "service": "transfer_service",
                "error": str(e)
            }
        ) 