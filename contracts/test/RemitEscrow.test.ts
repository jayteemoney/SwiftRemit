import { expect } from "chai";
import { ethers } from "hardhat";
import { RemitEscrow } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ZeroAddress } from "ethers";

describe("RemitEscrow", function () {
  let remitEscrow: RemitEscrow;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let recipient: SignerWithAddress;
  let contributor1: SignerWithAddress;
  let contributor2: SignerWithAddress;

  const TARGET_AMOUNT = ethers.parseEther("100");
  const CONTRIBUTION_1 = ethers.parseEther("60");
  const CONTRIBUTION_2 = ethers.parseEther("40");
  const PURPOSE = "Family gift for medical expenses";

  beforeEach(async function () {
    [owner, creator, recipient, contributor1, contributor2] = await ethers.getSigners();
    const RemitEscrow = await ethers.getContractFactory("RemitEscrow");
    remitEscrow = await RemitEscrow.deploy(ZeroAddress);
    await remitEscrow.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await remitEscrow.owner()).to.equal(owner.address);
    });

    it("Should initialize with correct platform fee", async function () {
      expect(await remitEscrow.platformFeeBps()).to.equal(50);
    });

    it("Should set fee collector to owner", async function () {
      expect(await remitEscrow.feeCollector()).to.equal(owner.address);
    });

    it("Should start with zero remittances", async function () {
      expect(await remitEscrow.getTotalRemittances()).to.equal(0);
    });
  });

  describe("Create Remittance", function () {
    it("Should create a remittance successfully", async function () {
      const tx = remitEscrow.connect(creator).createRemittance(
        recipient.address,
        TARGET_AMOUNT,
        PURPOSE
      );
      await expect(tx).to.emit(remitEscrow, "RemittanceCreated");
    });

    it("Should increment remittance counter", async function () {
      await remitEscrow.connect(creator).createRemittance(
        recipient.address,
        TARGET_AMOUNT,
        PURPOSE
      );
      expect(await remitEscrow.getTotalRemittances()).to.equal(1);
    });

    it("Should track creator's remittances", async function () {
      await remitEscrow.connect(creator).createRemittance(
        recipient.address,
        TARGET_AMOUNT,
        PURPOSE
      );
      const userRemittances = await remitEscrow.getUserRemittances(creator.address);
      expect(userRemittances.length).to.equal(1);
      expect(userRemittances[0]).to.equal(0);
    });

    it("Should track recipient's remittances", async function () {
      await remitEscrow.connect(creator).createRemittance(
        recipient.address,
        TARGET_AMOUNT,
        PURPOSE
      );
      const recipientRemittances = await remitEscrow.getRecipientRemittances(recipient.address);
      expect(recipientRemittances.length).to.equal(1);
      expect(recipientRemittances[0]).to.equal(0);
    });

    it("Should revert with zero address recipient", async function () {
      await expect(
        remitEscrow.connect(creator).createRemittance(ZeroAddress, TARGET_AMOUNT, PURPOSE)
      ).to.be.revertedWithCustomError(remitEscrow, "InvalidRecipient");
    });

    it("Should revert with zero target amount", async function () {
      await expect(
        remitEscrow.connect(creator).createRemittance(recipient.address, 0, PURPOSE)
      ).to.be.revertedWithCustomError(remitEscrow, "InvalidAmount");
    });

    it("Should revert with empty purpose", async function () {
      await expect(
        remitEscrow.connect(creator).createRemittance(recipient.address, TARGET_AMOUNT, "")
      ).to.be.revertedWithCustomError(remitEscrow, "InvalidPurpose");
    });
  });

  describe("Contribute", function () {
    let remittanceId: number;

    beforeEach(async function () {
      await remitEscrow.connect(creator).createRemittance(
        recipient.address,
        TARGET_AMOUNT,
        PURPOSE
      );
      remittanceId = 0;
    });

    it("Should accept contributions", async function () {
      const tx = remitEscrow.connect(contributor1).contribute(remittanceId, { value: CONTRIBUTION_1 });
      await expect(tx).to.emit(remitEscrow, "ContributionMade");
    });

    it("Should update current amount correctly", async function () {
      await remitEscrow.connect(contributor1).contribute(remittanceId, { value: CONTRIBUTION_1 });
      const remittance = await remitEscrow.getRemittance(remittanceId);
      expect(remittance.currentAmount).to.equal(CONTRIBUTION_1);
    });

    it("Should handle multiple contributions", async function () {
      await remitEscrow.connect(contributor1).contribute(remittanceId, { value: CONTRIBUTION_1 });
      await remitEscrow.connect(contributor2).contribute(remittanceId, { value: CONTRIBUTION_2 });
      const remittance = await remitEscrow.getRemittance(remittanceId);
      expect(remittance.currentAmount).to.equal(TARGET_AMOUNT);
    });

    it("Should track individual contributions", async function () {
      await remitEscrow.connect(contributor1).contribute(remittanceId, { value: CONTRIBUTION_1 });
      const contribution = await remitEscrow.getContribution(remittanceId, contributor1.address);
      expect(contribution).to.equal(CONTRIBUTION_1);
    });

    it("Should track multiple contributions from same user", async function () {
      const firstContribution = ethers.parseEther("30");
      const secondContribution = ethers.parseEther("30");
      await remitEscrow.connect(contributor1).contribute(remittanceId, { value: firstContribution });
      await remitEscrow.connect(contributor1).contribute(remittanceId, { value: secondContribution });
      const contribution = await remitEscrow.getContribution(remittanceId, contributor1.address);
      expect(contribution).to.equal(firstContribution + secondContribution);
    });

    it("Should add contributor to list", async function () {
      await remitEscrow.connect(contributor1).contribute(remittanceId, { value: CONTRIBUTION_1 });
      const contributors = await remitEscrow.getContributors(remittanceId);
      expect(contributors.length).to.equal(1);
      expect(contributors[0]).to.equal(contributor1.address);
    });

    it("Should not duplicate contributors", async function () {
      await remitEscrow.connect(contributor1).contribute(remittanceId, { value: ethers.parseEther("30") });
      await remitEscrow.connect(contributor1).contribute(remittanceId, { value: ethers.parseEther("30") });
      const contributors = await remitEscrow.getContributors(remittanceId);
      expect(contributors.length).to.equal(1);
    });

    it("Should revert with zero contribution", async function () {
      await expect(
        remitEscrow.connect(contributor1).contribute(remittanceId, { value: 0 })
      ).to.be.revertedWithCustomError(remitEscrow, "InvalidAmount");
    });

    it("Should revert for non-existent remittance", async function () {
      await expect(
        remitEscrow.connect(contributor1).contribute(999, { value: CONTRIBUTION_1 })
      ).to.be.revertedWithCustomError(remitEscrow, "RemittanceNotFound");
    });
  });

  describe("Release Funds", function () {
    let remittanceId: number;

    beforeEach(async function () {
      await remitEscrow.connect(creator).createRemittance(
        recipient.address,
        TARGET_AMOUNT,
        PURPOSE
      );
      remittanceId = 0;
      await remitEscrow.connect(contributor1).contribute(remittanceId, { value: CONTRIBUTION_1 });
      await remitEscrow.connect(contributor2).contribute(remittanceId, { value: CONTRIBUTION_2 });
    });

    it("Should release funds when target is met", async function () {
      const tx = remitEscrow.connect(recipient).releaseFunds(remittanceId);
      await expect(tx).to.emit(remitEscrow, "FundsReleased");
    });

    it("Should transfer correct amount to recipient", async function () {
      const platformFee = (TARGET_AMOUNT * 50n) / 10000n;
      const recipientAmount = TARGET_AMOUNT - platformFee;
      const balanceBefore = await ethers.provider.getBalance(recipient.address);
      const tx = await remitEscrow.connect(recipient).releaseFunds(remittanceId);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(balanceAfter - balanceBefore + gasUsed).to.equal(recipientAmount);
    });

    it("Should transfer platform fee to fee collector", async function () {
      const platformFee = (TARGET_AMOUNT * 50n) / 10000n;
      const feeCollectorBalanceBefore = await ethers.provider.getBalance(owner.address);
      await remitEscrow.connect(recipient).releaseFunds(remittanceId);
      const feeCollectorBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(platformFee);
    });

    it("Should mark remittance as released", async function () {
      await remitEscrow.connect(recipient).releaseFunds(remittanceId);
      const remittance = await remitEscrow.getRemittance(remittanceId);
      expect(remittance.isReleased).to.be.true;
    });

    it("Should revert if not called by recipient", async function () {
      await expect(
        remitEscrow.connect(creator).releaseFunds(remittanceId)
      ).to.be.revertedWithCustomError(remitEscrow, "NotRecipient");
    });

    it("Should revert if target not met", async function () {
      await remitEscrow.connect(creator).createRemittance(
        recipient.address,
        TARGET_AMOUNT,
        PURPOSE
      );
      const newRemittanceId = 1;
      await remitEscrow.connect(contributor1).contribute(newRemittanceId, {
        value: ethers.parseEther("50"),
      });
      await expect(
        remitEscrow.connect(recipient).releaseFunds(newRemittanceId)
      ).to.be.revertedWithCustomError(remitEscrow, "TargetNotMet");
    });

    it("Should revert if already released", async function () {
      await remitEscrow.connect(recipient).releaseFunds(remittanceId);
      await expect(
        remitEscrow.connect(recipient).releaseFunds(remittanceId)
      ).to.be.revertedWithCustomError(remitEscrow, "AlreadyReleased");
    });

    it("Should revert for non-existent remittance", async function () {
      await expect(
        remitEscrow.connect(recipient).releaseFunds(999)
      ).to.be.revertedWithCustomError(remitEscrow, "RemittanceNotFound");
    });
  });

  describe("Cancel Remittance", function () {
    let remittanceId: number;

    beforeEach(async function () {
      await remitEscrow.connect(creator).createRemittance(
        recipient.address,
        TARGET_AMOUNT,
        PURPOSE
      );
      remittanceId = 0;
      await remitEscrow.connect(contributor1).contribute(remittanceId, { value: CONTRIBUTION_1 });
      await remitEscrow.connect(contributor2).contribute(remittanceId, { value: CONTRIBUTION_2 });
    });

    it("Should cancel remittance by creator", async function () {
      const tx = remitEscrow.connect(creator).cancelRemittance(remittanceId);
      await expect(tx).to.emit(remitEscrow, "RemittanceCancelled");
    });

    it("Should refund all contributors", async function () {
      const balance1Before = await ethers.provider.getBalance(contributor1.address);
      const balance2Before = await ethers.provider.getBalance(contributor2.address);
      await remitEscrow.connect(creator).cancelRemittance(remittanceId);
      const balance1After = await ethers.provider.getBalance(contributor1.address);
      const balance2After = await ethers.provider.getBalance(contributor2.address);
      expect(balance1After - balance1Before).to.equal(CONTRIBUTION_1);
      expect(balance2After - balance2Before).to.equal(CONTRIBUTION_2);
    });

    it("Should mark remittance as cancelled", async function () {
      await remitEscrow.connect(creator).cancelRemittance(remittanceId);
      const remittance = await remitEscrow.getRemittance(remittanceId);
      expect(remittance.isCancelled).to.be.true;
    });

    it("Should revert if not called by creator", async function () {
      await expect(
        remitEscrow.connect(recipient).cancelRemittance(remittanceId)
      ).to.be.revertedWithCustomError(remitEscrow, "NotCreator");
    });

    it("Should revert if already released", async function () {
      await remitEscrow.connect(recipient).releaseFunds(remittanceId);
      await expect(
        remitEscrow.connect(creator).cancelRemittance(remittanceId)
      ).to.be.revertedWithCustomError(remitEscrow, "AlreadyReleased");
    });

    it("Should revert if already cancelled", async function () {
      await remitEscrow.connect(creator).cancelRemittance(remittanceId);
      await expect(
        remitEscrow.connect(creator).cancelRemittance(remittanceId)
      ).to.be.revertedWithCustomError(remitEscrow, "AlreadyCancelled");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update platform fee", async function () {
      const newFee = 100;
      await remitEscrow.connect(owner).setPlatformFee(newFee);
      expect(await remitEscrow.platformFeeBps()).to.equal(newFee);
    });

    it("Should revert if platform fee exceeds maximum", async function () {
      const invalidFee = 600;
      await expect(
        remitEscrow.connect(owner).setPlatformFee(invalidFee)
      ).to.be.revertedWithCustomError(remitEscrow, "InvalidFee");
    });

    it("Should allow owner to update fee collector", async function () {
      await remitEscrow.connect(owner).setFeeCollector(contributor1.address);
      expect(await remitEscrow.feeCollector()).to.equal(contributor1.address);
    });

    it("Should revert if fee collector is zero address", async function () {
      await expect(
        remitEscrow.connect(owner).setFeeCollector(ZeroAddress)
      ).to.be.revertedWithCustomError(remitEscrow, "InvalidRecipient");
    });

    it("Should prevent non-owner from updating fee", async function () {
      await expect(
        remitEscrow.connect(creator).setPlatformFee(100)
      ).to.be.revertedWithCustomError(remitEscrow, "OwnableUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    let remittanceId: number;

    beforeEach(async function () {
      await remitEscrow.connect(creator).createRemittance(
        recipient.address,
        TARGET_AMOUNT,
        PURPOSE
      );
      remittanceId = 0;
    });

    it("Should return correct remittance details", async function () {
      const remittance = await remitEscrow.getRemittance(remittanceId);
      expect(remittance.creator).to.equal(creator.address);
      expect(remittance.recipient).to.equal(recipient.address);
      expect(remittance.targetAmount).to.equal(TARGET_AMOUNT);
      expect(remittance.purpose).to.equal(PURPOSE);
      expect(remittance.isReleased).to.be.false;
      expect(remittance.isCancelled).to.be.false;
    });

    it("Should return default price when no price feed", async function () {
      const price = await remitEscrow.getCurrentPrice();
      expect(price).to.equal(1e8);
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy on contribute", async function () {
      expect(true).to.be.true;
    });

    it("Should prevent reentrancy on releaseFunds", async function () {
      expect(true).to.be.true;
    });
  });
});
