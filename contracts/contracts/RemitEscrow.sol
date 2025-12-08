// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title RemitEscrow
 * @dev Escrow contract for peer-to-peer remittances on Celo with group contributions
 * @notice Enables users to create remittances, accept group contributions,
 * and release funds when targets are met. Integrates Chainlink for forex data.
 */
contract RemitEscrow is ReentrancyGuard, Ownable {

    // ============ Structs ============
    struct Remittance {
        uint256 id;
        address creator;
        address recipient;
        uint256 targetAmount;
        uint256 currentAmount;
        string purpose;
        uint256 createdAt;
        bool isReleased;
        bool isCancelled;
        address[] contributors;
        mapping(address => uint256) contributions;
    }

    // ============ State Variables ============
    uint256 private _remittanceIdCounter;
    mapping(uint256 => Remittance) private _remittances;
    mapping(address => uint256[]) private _userRemittances;
    mapping(address => uint256[]) private _recipientRemittances;

    AggregatorV3Interface public priceFeed;

    uint256 public platformFeeBps = 50;
    uint256 public constant MAX_FEE_BPS = 500;
    address public feeCollector;

    // ============ Events ============
    event RemittanceCreated(
        uint256 indexed remittanceId,
        address indexed creator,
        address indexed recipient,
        uint256 targetAmount,
        string purpose,
        uint256 timestamp
    );

    event ContributionMade(
        uint256 indexed remittanceId,
        address indexed contributor,
        uint256 amount,
        uint256 newTotal,
        uint256 timestamp
    );

    event FundsReleased(
        uint256 indexed remittanceId,
        address indexed recipient,
        uint256 amount,
        uint256 platformFee,
        uint256 timestamp
    );

    event RemittanceCancelled(
        uint256 indexed remittanceId,
        address indexed creator,
        uint256 timestamp
    );

    event PriceFeedUpdated(address indexed newPriceFeed);
    event PlatformFeeUpdated(uint256 newFeeBps);

    // ============ Errors ============
    error InvalidRecipient();
    error InvalidAmount();
    error InvalidPurpose();
    error RemittanceNotFound();
    error AlreadyReleased();
    error AlreadyCancelled();
    error NotRecipient();
    error NotCreator();
    error TargetNotMet();
    error TransferFailed();
    error InvalidFee();
    error NoContributions();

    // ============ Constructor ============
    constructor(address _priceFeed) Ownable(msg.sender) {
        if (_priceFeed != address(0)) {
            priceFeed = AggregatorV3Interface(_priceFeed);
        }
        feeCollector = msg.sender;
    }

    // ============ Core Functions ============

    function createRemittance(
        address recipient,
        uint256 targetAmount,
        string calldata purpose
    ) external returns (uint256) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (targetAmount == 0) revert InvalidAmount();
        if (bytes(purpose).length == 0) revert InvalidPurpose();

        uint256 remittanceId = _remittanceIdCounter++;
        Remittance storage newRemittance = _remittances[remittanceId];

        newRemittance.id = remittanceId;
        newRemittance.creator = msg.sender;
        newRemittance.recipient = recipient;
        newRemittance.targetAmount = targetAmount;
        newRemittance.currentAmount = 0;
        newRemittance.purpose = purpose;
        newRemittance.createdAt = block.timestamp;
        newRemittance.isReleased = false;
        newRemittance.isCancelled = false;

        _userRemittances[msg.sender].push(remittanceId);
        _recipientRemittances[recipient].push(remittanceId);

        emit RemittanceCreated(
            remittanceId,
            msg.sender,
            recipient,
            targetAmount,
            purpose,
            block.timestamp
        );

        return remittanceId;
    }

    function contribute(uint256 remittanceId) external payable nonReentrant {
        if (msg.value == 0) revert InvalidAmount();

        Remittance storage remittance = _remittances[remittanceId];
        if (remittance.creator == address(0)) revert RemittanceNotFound();
        if (remittance.isReleased) revert AlreadyReleased();
        if (remittance.isCancelled) revert AlreadyCancelled();

        if (remittance.contributions[msg.sender] == 0) {
            remittance.contributors.push(msg.sender);
        }

        remittance.contributions[msg.sender] += msg.value;
        remittance.currentAmount += msg.value;

        emit ContributionMade(
            remittanceId,
            msg.sender,
            msg.value,
            remittance.currentAmount,
            block.timestamp
        );
    }

    function releaseFunds(uint256 remittanceId) external nonReentrant {
        Remittance storage remittance = _remittances[remittanceId];

        if (remittance.creator == address(0)) revert RemittanceNotFound();
        if (msg.sender != remittance.recipient) revert NotRecipient();
        if (remittance.isReleased) revert AlreadyReleased();
        if (remittance.isCancelled) revert AlreadyCancelled();
        if (remittance.currentAmount < remittance.targetAmount) revert TargetNotMet();

        remittance.isReleased = true;

        uint256 platformFee = (remittance.currentAmount * platformFeeBps) / 10000;
        uint256 amountToRecipient = remittance.currentAmount - platformFee;

        (bool successRecipient, ) = payable(remittance.recipient).call{value: amountToRecipient}("");
        if (!successRecipient) revert TransferFailed();

        if (platformFee > 0) {
            (bool successFee, ) = payable(feeCollector).call{value: platformFee}("");
            if (!successFee) revert TransferFailed();
        }

        emit FundsReleased(
            remittanceId,
            remittance.recipient,
            amountToRecipient,
            platformFee,
            block.timestamp
        );
    }

    function cancelRemittance(uint256 remittanceId) external nonReentrant {
        Remittance storage remittance = _remittances[remittanceId];

        if (remittance.creator == address(0)) revert RemittanceNotFound();
        if (msg.sender != remittance.creator) revert NotCreator();
        if (remittance.isReleased) revert AlreadyReleased();
        if (remittance.isCancelled) revert AlreadyCancelled();

        remittance.isCancelled = true;

        for (uint256 i = 0; i < remittance.contributors.length; i++) {
            address contributor = remittance.contributors[i];
            uint256 amount = remittance.contributions[contributor];

            if (amount > 0) {
                remittance.contributions[contributor] = 0;
                (bool success, ) = payable(contributor).call{value: amount}("");
                if (!success) revert TransferFailed();
            }
        }

        emit RemittanceCancelled(remittanceId, msg.sender, block.timestamp);
    }

    // ============ View Functions ============

    function getRemittance(uint256 remittanceId) external view returns (
        address creator,
        address recipient,
        uint256 targetAmount,
        uint256 currentAmount,
        string memory purpose,
        uint256 createdAt,
        bool isReleased,
        bool isCancelled
    ) {
        Remittance storage remittance = _remittances[remittanceId];
        if (remittance.creator == address(0)) revert RemittanceNotFound();

        return (
            remittance.creator,
            remittance.recipient,
            remittance.targetAmount,
            remittance.currentAmount,
            remittance.purpose,
            remittance.createdAt,
            remittance.isReleased,
            remittance.isCancelled
        );
    }

    function getUserRemittances(address user) external view returns (uint256[] memory) {
        return _userRemittances[user];
    }

    function getRecipientRemittances(address recipient) external view returns (uint256[] memory) {
        return _recipientRemittances[recipient];
    }

    function getContribution(uint256 remittanceId, address contributor) external view returns (uint256) {
        return _remittances[remittanceId].contributions[contributor];
    }

    function getContributors(uint256 remittanceId) external view returns (address[] memory) {
        return _remittances[remittanceId].contributors;
    }

    function getCurrentPrice() external view returns (int256) {
        if (address(priceFeed) == address(0)) {
            return 1e8;
        }

        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    function getTotalRemittances() external view returns (uint256) {
        return _remittanceIdCounter;
    }

    // ============ Admin Functions ============

    function setPriceFeed(address _priceFeed) external onlyOwner {
        priceFeed = AggregatorV3Interface(_priceFeed);
        emit PriceFeedUpdated(_priceFeed);
    }

    function setPlatformFee(uint256 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert InvalidFee();
        platformFeeBps = _feeBps;
        emit PlatformFeeUpdated(_feeBps);
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        if (_feeCollector == address(0)) revert InvalidRecipient();
        feeCollector = _feeCollector;
    }

    // ============ Emergency Functions ============

    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        if (!success) revert TransferFailed();
    }

    // ============ Receive Function ============

    receive() external payable {}
}
